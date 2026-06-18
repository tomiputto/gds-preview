export type VercelDeployment = {
  id?: string;
  uid?: string;
  url: string;
  alias?: string[];
  aliasAssigned?: boolean;
  aliasAssignedAt?: number | boolean;
  readyState?: string;
  state?: string;
  status?: string;
};

export function getVercelEnv() {
  const teamId = process.env.VERCEL_TEAM_ID?.trim();
  return {
    VERCEL_TOKEN: process.env.VERCEL_TOKEN ?? "",
    VERCEL_TEAM_ID: teamId || undefined,
  };
}

function deploymentApiUrl(deploymentRef: string, teamId?: string) {
  const encoded = encodeURIComponent(deploymentRef);
  return teamId
    ? `https://api.vercel.com/v13/deployments/${encoded}?teamId=${teamId}`
    : `https://api.vercel.com/v13/deployments/${encoded}`;
}

export async function fetchDeployment(
  deploymentRef: string,
  token: string,
  teamId?: string
): Promise<VercelDeployment> {
  const res = await fetch(deploymentApiUrl(deploymentRef, teamId), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch deployment ${deploymentRef}: ${res.status}`);
  }
  return res.json();
}

function deploymentStates(deployment: VercelDeployment) {
  return [deployment.readyState, deployment.state, deployment.status]
    .filter(Boolean)
    .map((value) => String(value).toUpperCase());
}

export function isDeploymentReady(deployment: VercelDeployment) {
  return deploymentStates(deployment).includes("READY");
}

export function isDeploymentFailed(deployment: VercelDeployment) {
  return deploymentStates(deployment).some(
    (value) => value === "ERROR" || value === "CANCELED"
  );
}

export function isAliasAssigned(deployment: VercelDeployment) {
  if (deployment.aliasAssigned === true) return true;
  if (typeof deployment.aliasAssignedAt === "number") return true;
  return Array.isArray(deployment.alias) && deployment.alias.length > 0;
}

async function fetchLatestDeploymentByApp(
  appName: string,
  token: string,
  teamId?: string
): Promise<VercelDeployment | null> {
  const params = new URLSearchParams({ app: appName, limit: "1" });
  const url = teamId
    ? `https://api.vercel.com/v6/deployments?teamId=${teamId}&${params}`
    : `https://api.vercel.com/v6/deployments?${params}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;

  const data = (await res.json()) as { deployments?: VercelDeployment[] };
  return data.deployments?.[0] ?? null;
}

export async function resolveDeployment(
  refs: { deploymentId: string; previewUrl: string; project?: string | null },
  token: string,
  teamId?: string
): Promise<VercelDeployment> {
  const hostname = new URL(refs.previewUrl).hostname;
  const projectName = refs.project ?? hostname.replace(".vercel.app", "");
  const lookupRefs = [refs.deploymentId, hostname, projectName];

  for (const ref of lookupRefs) {
    const attempts = teamId ? [teamId, undefined] : [undefined];
    for (const scopedTeamId of attempts) {
      try {
        return await fetchDeployment(ref, token, scopedTeamId);
      } catch {
        continue;
      }
    }
  }

  const listAttempts = teamId ? [teamId, undefined] : [undefined];
  for (const scopedTeamId of listAttempts) {
    const listed = await fetchLatestDeploymentByApp(projectName, token, scopedTeamId);
    if (listed) return listed;
  }

  throw new Error(`Deployment not found for ${refs.deploymentId}`);
}
