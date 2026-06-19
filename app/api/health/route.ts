import { NextResponse } from "next/server";
import { getVercelEnv } from "@/lib/vercel-deployment";

export async function GET() {
  const { VERCEL_TOKEN } = getVercelEnv();
  const hasApiSecret = Boolean(process.env.API_SECRET?.trim());
  const hasVercelToken = Boolean(VERCEL_TOKEN);

  return NextResponse.json({
    ok: hasApiSecret && hasVercelToken,
    configured: {
      apiSecret: hasApiSecret,
      vercelToken: hasVercelToken,
    },
  });
}
