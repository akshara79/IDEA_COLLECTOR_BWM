// Minimal client helpers used by the static HTML pages.
// The API endpoints called here assume the backend is available on the same origin.

async function apiGet(path) {
  const res = await fetch(path, { credentials: 'same-origin' });
  if (!res.ok) {
    const text = await res.text().catch(()=>null);
    throw new Error(`GET ${path} failed: ${res.status} ${res.statusText} ${text ? ' - '+text : ''}`);
  }
  return res.json();
}

async function apiPost(path, body) {
  const res = await fetch(path, {
    method: 'POST',
    body: JSON.stringify(body || {}),
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin'
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => null);
    throw new Error(`POST ${path} failed: ${res.status} ${res.statusText} ${txt ? ' - '+txt : ''}`);
  }
  // Try parse JSON, but allow empty
  const text = await res.text();
  try { return text ? JSON.parse(text) : {}; } catch(e) { return text; }
}

function escapeHtml(s) {
  if (!s && s !== 0) return '';
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}