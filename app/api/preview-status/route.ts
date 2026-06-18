import { NextRequest, NextResponse } from "next/server";
import {
  fetchDeployment,
  getVercelEnv,
} from "@/lib/vercel-deployment";

export async function GET(request: NextRequest) {
  const deploymentId = request.nextUrl.searchParams.get("deploymentId");
  const previewUrl = request.nextUrl.searchParams.get("url");

  if (!deploymentId || !previewUrl) {
    return NextResponse.json({ error: "Missing deploymentId or url" }, { status: 400 });
  }

  const { VERCEL_TOKEN, VERCEL_TEAM_ID } = getVercelEnv();
  if (!VERCEL_TOKEN) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  try {
    const deployment = await fetchDeployment(deploymentId, VERCEL_TOKEN, VERCEL_TEAM_ID);

    if (deployment.readyState === "ERROR" || deployment.readyState === "CANCELED") {
      return NextResponse.json({ status: "error", previewUrl });
    }

    if (deployment.readyState === "READY") {
      return NextResponse.json({ status: "ready", previewUrl });
    }

    return NextResponse.json({
      status: deployment.aliasAssigned ? "building" : "waiting",
      previewUrl,
    });
  } catch (error) {
    console.error("preview-status failed:", error);
    return NextResponse.json({ error: "Failed to check deployment" }, { status: 502 });
  }
}
