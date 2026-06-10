# gds-preview

API backend for **ChatGPT Custom GPT** live React previews. Deployed at [gds-preview-app-muxj.vercel.app](https://gds-preview-app-muxj.vercel.app).

Supports multiple design systems on the **same** Action URL — each Custom GPT passes a `designSystem` id so stacks do not overwrite or break each other.

| `designSystem` | npm scope | Custom GPT instructions |
|----------------|-----------|-------------------------|
| `gds` | `@gdesignsystem/*` (Gofore GDS) | [`CUSTOM_GPT_INSTRUCTIONS.md`](./CUSTOM_GPT_INSTRUCTIONS.md) |
| `gds-vero` | `@gds-vero/*` (vero.fi) | [`CUSTOM_GPT_INSTRUCTIONS_GDS_VERO.md`](./CUSTOM_GPT_INSTRUCTIONS_GDS_VERO.md) |

## API

`POST /api/create-preview` with Bearer `API_SECRET`:

```json
{
  "designSystem": "gds-vero",
  "appCode": "export default function App() { ... }",
  "extraFiles": { "src/components/Card.tsx": "..." },
  "title": "My preview"
}
```

Response includes a unique public `previewUrl`. OpenAPI schema: [`public/openapi.json`](./public/openapi.json).

## Environment

Copy `.env.example` → `.env.local`:

- `VERCEL_TOKEN` — Vercel API token
- `API_SECRET` — shared secret for Custom GPT Action auth
- `VERCEL_TEAM_ID` — optional

## Custom GPT setup

1. Deploy this app to Vercel.
2. In ChatGPT → Custom GPT → **Actions**, import schema from `https://gds-preview-app-muxj.vercel.app/openapi.json` (or paste `public/openapi.json`).
3. Set Authentication → API Key → Bearer → your `API_SECRET`.
4. Paste instructions from the correct `CUSTOM_GPT_INSTRUCTIONS*.md` file.

After updating `openapi.json`, re-import the Action schema in **both** Custom GPTs.

## Local dev

```bash
npm install
npm run dev
```
