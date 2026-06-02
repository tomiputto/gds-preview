export default function Privacy() {
  return (
    <main style={{ fontFamily: "system-ui", padding: "2rem", maxWidth: 600 }}>
      <h1>Privacy Policy</h1>
      <p><strong>GDS Preview API</strong></p>
      <p>Last updated: June 2, 2026</p>

      <h2>What we collect</h2>
      <p>
        When you use the GDS Preview API (via the Custom GPT action), we receive
        the React source code you submit. This code is sent to Vercel to create
        a preview deployment.
      </p>

      <h2>How we use it</h2>
      <p>
        Submitted code is used solely to build and deploy a temporary preview.
        We do not sell, share, or use your code for any other purpose.
      </p>

      <h2>Data retention</h2>
      <p>
        Preview deployments may be deleted periodically. We do not store your
        code beyond what is needed for the deployment.
      </p>

      <h2>Third parties</h2>
      <p>
        Deployments are hosted on <strong>Vercel</strong>. Their privacy policy
        applies to the hosting infrastructure.
      </p>

      <h2>Contact</h2>
      <p>Questions? Reach out via the GitHub repository.</p>
    </main>
  );
}
