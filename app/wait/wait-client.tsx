"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function WaitClient() {
  const params = useSearchParams();
  const deploymentId = params.get("deploymentId");
  const targetUrl = params.get("url");
  const [message, setMessage] = useState("Building preview…");

  useEffect(() => {
    if (!deploymentId || !targetUrl) {
      setMessage("Invalid preview link.");
      return;
    }

    const id = deploymentId;
    const url = targetUrl;
    let cancelled = false;

    async function poll() {
      while (!cancelled) {
        try {
          const statusUrl = `/api/preview-status?deploymentId=${encodeURIComponent(id)}&url=${encodeURIComponent(url)}`;
          const res = await fetch(statusUrl);
          const data = await res.json();

          if (data.status === "error") {
            setMessage("Preview build failed.");
            return;
          }

          if (data.status === "ready" || data.reachable) {
            window.location.replace(url);
            return;
          }
        } catch {
          // Keep polling on transient errors.
        }

        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    poll();
    return () => {
      cancelled = true;
    };
  }, [deploymentId, targetUrl]);

  return (
    <main
      style={{
        fontFamily: "system-ui, sans-serif",
        padding: "3rem 2rem",
        maxWidth: 480,
        margin: "0 auto",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>{message}</h1>
      <p style={{ color: "#666", margin: 0 }}>
        The preview opens automatically when the build is ready.
      </p>
    </main>
  );
}
