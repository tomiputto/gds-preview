export type VercelDeployment = {
  id: string;
  url: string;
  alias?: string[];
  aliasAssigned?: boolean;
  readyState?: string;
};

export function getVercelEnv() {
  return {
    VERCEL_TOKEN: process.env.VERCEL_TOKEN ?? "",
    VERCEL_TEAM_ID: process.env.VERCEL_TEAM_ID,
  };
}

function deploymentApiUrl(deploymentId: string, teamId?: string) {
  return teamId
    ? `https://api.vercel.com/v13/deployments/${deploymentId}?teamId=${teamId}`
    : `https://api.vercel.com/v13/deployments/${deploymentId}`;
}

export async function fetchDeployment(
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

export async function isPreviewUrlReachable(previewUrl: string) {
  try {
    const res = await fetch(previewUrl, { method: "GET", redirect: "follow" });
    return res.status !== 404;
  } catch {
    return false;
  }
}
