import { NextRequest, NextResponse } from "next/server";
import {
  getVercelEnv,
  isAliasAssigned,
  isDeploymentFailed,
  isDeploymentReady,
  resolveDeployment,
} from "@/lib/vercel-deployment";

export async function GET(request: NextRequest) {
  const deploymentId = request.nextUrl.searchParams.get("deploymentId");
  const previewUrl = request.nextUrl.searchParams.get("url");
  const project = request.nextUrl.searchParams.get("project");

  if (!deploymentId || !previewUrl) {
    return NextResponse.json({ error: "Missing deploymentId or url" }, { status: 400 });
  }

  const { VERCEL_TOKEN, VERCEL_TEAM_ID } = getVercelEnv();
  if (!VERCEL_TOKEN) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  try {
    const deployment = await resolveDeployment(
      { deploymentId, previewUrl, project },
      VERCEL_TOKEN,
      VERCEL_TEAM_ID
    );

    if (isDeploymentFailed(deployment)) {
      return NextResponse.json({ status: "error", previewUrl });
    }

    if (isDeploymentReady(deployment)) {
      return NextResponse.json({ status: "ready", previewUrl });
    }

    return NextResponse.json({
      status: isAliasAssigned(deployment) ? "building" : "waiting",
      previewUrl,
    });
  } catch (error) {
    console.error("preview-status failed:", error);
    return NextResponse.json({ error: "Failed to check deployment" }, { status: 502 });
  }
}
