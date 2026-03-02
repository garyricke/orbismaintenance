# Orbis Maintenance — Claude Code Instructions

## What this project is
Single self-contained HTML files — one per client — that show a client-facing hours report and AI-generated activity summary. Hosted on Netlify. No build tools, no framework, no package.json.

## Client pages
| File | Project Name | Password |
|------|-------------|----------|
| `the-edge-2.html` | The Edge 2 | the edge 2 |
| `the-ftnn-1.html` | FTNN 1 | ftnn 1 |
| `phils-1.html` | Phils 1 | phils 1 |
| `hamstra-1.html` | Hamstra 1 | hamstra 1 |

**`the-edge-2.html` is the canonical template.** Always copy this when adding a new client.

## Adding a new client page
1. Copy `the-edge-2.html` → rename to `clientname-N.html`
2. Update `<title>` tag
3. Change `projectName` and `googleDocId` in the CONFIG block
4. Generate password hash: `echo -n "client name" | shasum -a 256`
5. Replace `const _h = '...'` with the new hash
6. Commit and push

Password is always the project name in lowercase (e.g. `"The Edge 2"` → password `"the edge 2"`).

## Architecture

### CONFIG block (top of each file)
```js
const CONFIG = {
  projectName:    "Client Name Here",   // must match Clockify project name exactly
  googleDocId:    "GOOGLE_DOC_ID_HERE", // from docs.google.com/document/d/ID/edit
  clockifyApiKey: "NTE1OGI4ODMtZjBlMS00NmExLTkwNGYtN2ZjZDk1MTZkZTZm"
};
```
Only `projectName` and `googleDocId` change per client.

### Anthropic API key
NOT stored in the HTML. Set `ANTHROPIC_API_KEY` in Netlify → Site Settings → Environment Variables.

### Clockify API key
`NTE1OGI4ODMtZjBlMS00NmExLTkwNGYtN2ZjZDk1MTZkZTZm` — shared across all pages, safe to store in HTML.

### Data flow
- **Hours** — Clockify API, filtered by `CONFIG.projectName`
- **Notes** — Google Doc fetched via `corsproxy.io` (doc must be shared "Anyone with link – Viewer")
- **AI Summary** — streamed via Netlify Edge Function at `/api/summarize` (server-side Anthropic proxy, model: `claude-sonnet-4-6`)
- **Markdown** — rendered with `marked@12` from CDN

### Netlify Edge Functions
- `netlify/edge-functions/summarize.js` — Deno proxy to Anthropic API
- `netlify.toml` — routes `/api/summarize` and `/api/doc` to their functions

### Password gate
SHA-256 hash in `const _h`. Checked via `crypto.subtle.digest`. Session persisted in `sessionStorage` so the user only enters the password once per browser session.

## Key features

### `**` high-priority signal
Lines starting with `**` in the Google Doc notes are treated as critical items. The AI prompt flags these explicitly — they must appear in Next Steps and are never omitted.

### Rate limit handling
Input truncated to 40,000 chars (~10k tokens). Auto-retry loop: up to 3 attempts with 20s then 40s waits. Countdown shown in the loading UI.

### Ask Gar modal
Orange pill button (`#FF6600`) next to the "Activity Summary" label. Opens a fixed modal overlay with a Netlify form (Name, Email, Question). Submits via AJAX, auto-closes 2.5s after success.

### Favicon
`favicon.ico` at repo root — O + wrench logo on `#FF6600` orange.

### Brand orange
`#FF6600` (hover: `#e05a00`)

## Known bugs — don't repeat these

### Modal/form listeners must come before the auth early-return
The `DOMContentLoaded` handler has an early `return` for already-authenticated users. All modal open/close listeners AND the form submit listener must be wired up BEFORE that `return`, or returning users won't be able to open the modal or submit the form.

```js
document.addEventListener('DOMContentLoaded', () => {
  // ✅ Set up modal and form FIRST
  const modal = document.getElementById('askModal');
  // ... openModal / closeModal / form submit listener ...

  // THEN the auth check
  if (sessionStorage.getItem('_a') === _h) {
    document.getElementById('gate').style.display = 'none';
    init();
    return; // ← returning users exit here — everything above still ran
  }
  // ... password gate listeners ...
});
```

### generateSummary — build reqBody before the retry loop
Build `const reqBody = JSON.stringify({...})` first, then call `fetch(reqBody)` inside the retry loop. Do not nest `method`, `headers`, `body` inside `JSON.stringify`.

## Google Doc sharing steps
File → Share → General access → Anyone with the link (Viewer).
Doc ID is the string between `/d/` and `/edit` in the URL.
