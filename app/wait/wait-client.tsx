"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function WaitClient() {
  const params = useSearchParams();
  const deploymentId = params.get("deploymentId");
  const targetUrl = params.get("url");
  const project = params.get("project");
  const [message, setMessage] = useState("Building preview…");
  const [showManualLink, setShowManualLink] = useState(false);

  useEffect(() => {
    if (!deploymentId || !targetUrl) {
      setMessage("Invalid preview link.");
      return;
    }

    const id = deploymentId;
    const url = targetUrl;
    let cancelled = false;
    let failedPolls = 0;

    async function poll() {
      while (!cancelled) {
        try {
          const query = new URLSearchParams({
            deploymentId: id,
            url,
          });
          if (project) query.set("project", project);

          const res = await fetch(`/api/preview-status?${query}`);
          const data = await res.json();

          if (!res.ok) {
            failedPolls += 1;
            if (failedPolls >= 3) {
              setMessage("Still checking build status…");
              setShowManualLink(true);
            }
            await new Promise((resolve) => setTimeout(resolve, 2000));
            continue;
          }

          failedPolls = 0;

          if (data.status === "error") {
            setMessage("Preview build failed.");
            setShowManualLink(true);
            return;
          }

          if (data.status === "waiting") {
            setMessage("Starting deployment…");
          } else if (data.status === "building") {
            setMessage("Building preview…");
            setShowManualLink(true);
          }

          if (data.status === "ready") {
            window.location.replace(url);
            return;
          }
        } catch {
          failedPolls += 1;
          if (failedPolls >= 3) {
            setShowManualLink(true);
          }
        }

        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    poll();
    return () => {
      cancelled = true;
    };
  }, [deploymentId, targetUrl, project]);

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
      {showManualLink && targetUrl ? (
        <p style={{ marginTop: "1.5rem" }}>
          <a href={targetUrl} style={{ color: "#0066cc" }}>
            Open preview directly
          </a>
        </p>
      ) : null}
    </main>
  );
}
