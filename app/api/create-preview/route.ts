import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// Read env at request time, not module load time
function getEnv() {
  return {
    VERCEL_TOKEN: process.env.VERCEL_TOKEN ?? "",
    VERCEL_TEAM_ID: process.env.VERCEL_TEAM_ID,
    API_SECRET: process.env.API_SECRET ?? "",
  };
}

// Allowed npm dependencies in user projects
const ALLOWED_DEPS: Record<string, string> = {
  react: "^18.3.1",
  "react-dom": "^18.3.1",
  "@gdesignsystem/react": "^0.1.8",
  "@gdesignsystem/theme": "^0.1.8",
  "@gdesignsystem/icons": "^0.1.1",
  "@gdesignsystem/tokens": "^0.1.3",
  "@chakra-ui/react": "^3.0.0",
  "@emotion/react": "^11.0.0",
};

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

function buildTemplateFiles(
  appCode: string,
  extraFiles?: Record<string, string>,
  title?: string
) {
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
      dependencies: ALLOWED_DEPS,
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

  const mainTsx = `import React from "react";
import ReactDOM from "react-dom/client";
import { GDSProvider } from "@gdesignsystem/react";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <GDSProvider>
      <App />
    </GDSProvider>
  </React.StrictMode>
);`;

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
    { file: "src/main.tsx", data: mainTsx },
    { file: "src/App.tsx", data: appCode },
    { file: "vite.config.ts", data: viteConfig },
    { file: "tsconfig.json", data: tsconfig },
  ];

  // Add any extra component files
  if (extraFiles) {
    for (const [filePath, content] of Object.entries(extraFiles)) {
      // Only allow files under src/
      if (!filePath.startsWith("src/")) continue;
      // Block api routes, serverless functions
      if (filePath.includes("api/") || filePath.includes("serverless/"))
        continue;
      files.push({ file: filePath, data: content });
    }
  }

  return files;
}

export async function POST(request: NextRequest) {
  const env = getEnv();

  // Auth check
  const authHeader = request.headers.get("authorization");
  if (!env.API_SECRET || !authHeader || authHeader !== `Bearer ${env.API_SECRET}`) {
    const expected = `Bearer ${env.API_SECRET}`;
    return NextResponse.json(
      {
        error: "Unauthorized",
        debug: {
          hasSecret: !!env.API_SECRET,
          hasAuth: !!authHeader,
          secretLength: env.API_SECRET.length,
          authLength: authHeader?.length ?? 0,
          expectedLength: expected.length,
          authPrefix: authHeader?.slice(0, 10),
          match: authHeader === expected,
        },
      },
      { status: 401 }
    );
  }

  let body: {
    appCode: string;
    extraFiles?: Record<string, string>;
    title?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { appCode, extraFiles, title } = body;

  if (!appCode || typeof appCode !== "string") {
    return NextResponse.json(
      { error: "appCode is required and must be a string" },
      { status: 400 }
    );
  }

  // Validate main app code
  const appCodeError = validateCode(appCode);
  if (appCodeError) {
    return NextResponse.json(
      { error: `Blocked: ${appCodeError}` },
      { status: 400 }
    );
  }

  // Validate extra files
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

  // Build template files
  const files = buildTemplateFiles(appCode, extraFiles, title);

  // Convert file contents to base64 for Vercel API
  const vercelFiles = files.map((f) => ({
    file: f.file,
    data: Buffer.from(f.data).toString("base64"),
    encoding: "base64" as const,
  }));

  const previewId = crypto.randomUUID().slice(0, 8);
  const deploymentName = `gds-preview-${previewId}`;

  // Create Vercel deployment
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
        target: "preview",
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

    return NextResponse.json({
      previewUrl: `https://${deployment.url}`,
      deploymentId: deployment.id,
      previewId,
      status: "building",
    });
  } catch (error) {
    console.error("Deployment request failed:", error);
    return NextResponse.json(
      { error: "Failed to create deployment" },
      { status: 500 }
    );
  }
}
