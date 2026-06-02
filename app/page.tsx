export default function Home() {
  return (
    <main style={{ fontFamily: "system-ui", padding: "2rem", maxWidth: 600 }}>
      <h1>GDS Preview API</h1>
      <p>
        This service creates live preview deployments of React apps built with
        the <strong>GDS (Gofore Design System)</strong>.
      </p>
      <p>
        Use the Custom GPT action to send React code and receive a unique
        preview URL.
      </p>
      <h2>Endpoint</h2>
      <code>POST /api/create-preview</code>
      <h2>OpenAPI Spec</h2>
      <p>
        <a href="/openapi.json">/openapi.json</a>
      </p>
    </main>
  );
}
