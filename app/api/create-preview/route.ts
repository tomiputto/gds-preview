import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import {
  DEFAULT_DESIGN_SYSTEM,
  DESIGN_SYSTEMS,
  type DesignSystemId,
  resolveDesignSystem,
} from "./design-systems";

// Hobby caps at 10s; Pro allows up to 60s+ for alias polling before returning URL.
export const maxDuration = 60;

type VercelDeployment = {
  id: string;
  url: string;
  alias?: string[];
  aliasAssigned?: boolean;
  readyState?: string;
};

const PREVIEW_ALIAS_POLL_MS = 1500;
// Stay under Vercel Hobby's 10s function limit with room for deploy API + response.
const PREVIEW_ALIAS_MAX_WAIT_MS = 8500;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function deploymentApiUrl(deploymentId: string, teamId?: string) {
  return teamId
    ? `https://api.vercel.com/v13/deployments/${deploymentId}?teamId=${teamId}`
    : `https://api.vercel.com/v13/deployments/${deploymentId}`;
}

async function fetchDeployment(
  deploymentId: string,
  token: string,
  teamId?: string
): Promise<VercelDeployment> {
  const res = await fetch(deploymentApiUrl(deploymentId, token), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch deployment ${deploymentId}: ${res.status}`);
  }
  return res.json();
}

function isProjectAliasReady(deployment: VercelDeployment, projectDomain: string) {
  return (
    deployment.aliasAssigned === true &&
    Array.isArray(deployment.alias) &&
    deployment.alias.includes(projectDomain)
  );
}

async function isPreviewUrlReachable(previewUrl: string) {
  try {
    const res = await fetch(previewUrl, { method: "GET", redirect: "follow" });
    return res.status !== 404;
  } catch {
    return false;
  }
}

async function waitForPreviewUrl(
  deploymentId: string,
  projectDomain: string,
  previewUrl: string,
  token: string,
  teamId?: string
): Promise<{ deployment: VercelDeployment; status: "building" | "ready" }> {
  const deadline = Date.now() + PREVIEW_ALIAS_MAX_WAIT_MS;
  let deployment = await fetchDeployment(deploymentId, token, teamId);

  while (Date.now() < deadline) {
    if (deployment.readyState === "ERROR" || deployment.readyState === "CANCELED") {
      throw new Error(`Deployment ${deployment.readyState?.toLowerCase()}`);
    }

    const aliasReady = isProjectAliasReady(deployment, projectDomain);
    if (aliasReady && (await isPreviewUrlReachable(previewUrl))) {
      return {
        deployment,
        status: deployment.readyState === "READY" ? "ready" : "building",
      };
    }

    await sleep(PREVIEW_ALIAS_POLL_MS);
    deployment = await fetchDeployment(deploymentId, token, teamId);
  }

  return {
    deployment,
    status: deployment.readyState === "READY" ? "ready" : "building",
  };
}

// Read env at request time, not module load time
function getEnv() {
  return {
    VERCEL_TOKEN: process.env.VERCEL_TOKEN ?? "",
    VERCEL_TEAM_ID: process.env.VERCEL_TEAM_ID,
    API_SECRET: process.env.API_SECRET ?? "",
  };
}

const ALLOWED_DEV_DEPS: Record<string, string> = {
  vite: "^6.0.0",
  "@vitejs/plugin-react": "^4.0.0",
  typescript: "^5.0.0",
  "@types/react": "^18.0.0",
  "@types/react-dom": "^18.0.0",
};

// Dangerous patterns that must not appear in user code
const BLOCKED_PATTERNS = [
  /import\s.*from\s+['"]fs['"]/,
  /import\s.*from\s+['"]child_process['"]/,
  /import\s.*from\s+['"]net['"]/,
  /require\s*\(\s*['"]fs['"]\)/,
  /require\s*\(\s*['"]child_process['"]\)/,
  /eval\s*\(/,
  /Function\s*\(/,
  /process\.env/,
];

function validateCode(code: string): string | null {
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(code)) {
      return `Blocked pattern detected: ${pattern.source}`;
    }
  }
  return null;
}

function validateDesignSystemImports(
  designSystem: DesignSystemId,
  chunks: Array<{ label: string; code: string }>
): string | null {
  const config = DESIGN_SYSTEMS[designSystem];
  for (const { label, code } of chunks) {
    if (config.forbiddenImportPattern.test(code)) {
      return `${label} imports the wrong design system for designSystem="${designSystem}". Use only ${config.providerPackage} and related packages for this stack.`;
    }
  }
  return null;
}

function buildMainTsx(providerPackage: string) {
  return `import React from "react";
import ReactDOM from "react-dom/client";
import { GDSProvider } from "${providerPackage}";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <GDSProvider>
      <App />
    </GDSProvider>
  </React.StrictMode>
);`;
}

function buildTemplateFiles(
  designSystem: DesignSystemId,
  appCode: string,
  extraFiles?: Record<string, string>,
  title?: string
) {
  const config = DESIGN_SYSTEMS[designSystem];

  const packageJson = JSON.stringify(
    {
      name: "gds-preview-app",
      private: true,
      version: "0.0.0",
      type: "module",
      scripts: {
        dev: "vite",
        build: "vite build",
        preview: "vite preview",
      },
      dependencies: config.dependencies,
      devDependencies: ALLOWED_DEV_DEPS,
    },
    null,
    2
  );

  const indexHtml = `<!DOCTYPE html>
<html lang="fi">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title ?? "GDS Preview"}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;

  const viteConfig = `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
});`;

  const tsconfig = JSON.stringify(
    {
      compilerOptions: {
        target: "ES2020",
        useDefineForClassFields: true,
        lib: ["ES2020", "DOM", "DOM.Iterable"],
        module: "ESNext",
        skipLibCheck: true,
        moduleResolution: "bundler",
        allowImportingTsExtensions: true,
        isolatedModules: true,
        moduleDetection: "force",
        noEmit: true,
        jsx: "react-jsx",
        strict: true,
      },
      include: ["src"],
    },
    null,
    2
  );

  const files: Array<{ file: string; data: string }> = [
    { file: "package.json", data: packageJson },
    { file: "index.html", data: indexHtml },
    { file: "src/main.tsx", data: buildMainTsx(config.providerPackage) },
    { file: "src/App.tsx", data: appCode },
    { file: "vite.config.ts", data: viteConfig },
    { file: "tsconfig.json", data: tsconfig },
  ];

  if (extraFiles) {
    for (const [filePath, content] of Object.entries(extraFiles)) {
      if (!filePath.startsWith("src/")) continue;
      if (filePath.includes("api/") || filePath.includes("serverless/")) continue;
      files.push({ file: filePath, data: content });
    }
  }

  return files;
}

export async function POST(request: NextRequest) {
  const env = getEnv();

  const authHeader = request.headers.get("authorization");
  if (!env.API_SECRET || !authHeader || authHeader !== `Bearer ${env.API_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    appCode: string;
    extraFiles?: Record<string, string>;
    title?: string;
    designSystem?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { appCode, extraFiles, title, designSystem: designSystemRaw } = body;
  const designSystem = resolveDesignSystem(designSystemRaw);

  if (!designSystem) {
    return NextResponse.json(
      {
        error: 'Invalid designSystem. Use "gds" (Gofore GDS) or "gds-vero" (Verohallinto / vero.fi).',
      },
      { status: 400 }
    );
  }

  if (!appCode || typeof appCode !== "string") {
    return NextResponse.json(
      { error: "appCode is required and must be a string" },
      { status: 400 }
    );
  }

  const appCodeError = validateCode(appCode);
  if (appCodeError) {
    return NextResponse.json({ error: `Blocked: ${appCodeError}` }, { status: 400 });
  }

  if (extraFiles) {
    for (const [filePath, content] of Object.entries(extraFiles)) {
      const extraError = validateCode(content);
      if (extraError) {
        return NextResponse.json(
          { error: `Blocked in ${filePath}: ${extraError}` },
          { status: 400 }
        );
      }
    }
  }

  const importChunks = [
    { label: "appCode", code: appCode },
    ...Object.entries(extraFiles ?? {}).map(([filePath, code]) => ({
      label: filePath,
      code,
    })),
  ];
  const importError = validateDesignSystemImports(designSystem, importChunks);
  if (importError) {
    return NextResponse.json({ error: importError }, { status: 400 });
  }

  const files = buildTemplateFiles(designSystem, appCode, extraFiles, title);

  const vercelFiles = files.map((f) => ({
    file: f.file,
    data: Buffer.from(f.data).toString("base64"),
    encoding: "base64" as const,
  }));

  const previewId = crypto.randomUUID().slice(0, 8);
  const deploymentPrefix = designSystem === DEFAULT_DESIGN_SYSTEM ? "gds-preview" : "gds-vero-preview";
  const deploymentName = `${deploymentPrefix}-${previewId}`;

  const vercelUrl = env.VERCEL_TEAM_ID
    ? `https://api.vercel.com/v13/deployments?teamId=${env.VERCEL_TEAM_ID}`
    : "https://api.vercel.com/v13/deployments";

  try {
    const vercelRes = await fetch(vercelUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.VERCEL_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: deploymentName,
        files: vercelFiles,
        // Each preview is its own Vercel project with a single deployment.
        // Production target assigns the project .vercel.app domain to this
        // deployment. Preview target leaves that domain unbound (404) while
        // deployment.url stays behind Standard Protection on Hobby.
        target: "production",
        alias: [`${deploymentName}.vercel.app`],
        projectSettings: {
          framework: "vite",
          buildCommand: "npm run build",
          outputDirectory: "dist",
          installCommand: "npm install",
        },
      }),
    });

    if (!vercelRes.ok) {
      const errorData = await vercelRes.json();
      console.error("Vercel API error:", errorData);
      return NextResponse.json(
        { error: "Deployment failed", details: errorData },
        { status: 502 }
      );
    }

    const deployment = await vercelRes.json();

    const projectDomain = `${deploymentName}.vercel.app`;
    const previewUrl = `https://${projectDomain}`;

    const { status } = await waitForPreviewUrl(
      deployment.id,
      projectDomain,
      previewUrl,
      env.VERCEL_TOKEN,
      env.VERCEL_TEAM_ID
    );

    return NextResponse.json({
      previewUrl,
      deploymentId: deployment.id,
      previewId,
      designSystem,
      status,
    });
  } catch (error) {
    console.error("Deployment request failed:", error);
    return NextResponse.json({ error: "Failed to create deployment" }, { status: 500 });
  }
}
