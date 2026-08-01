const BASE = '/api/notion';

export async function fetchClients() {
  const r = await fetch(BASE);
  if (!r.ok) throw new Error(`Notion fetch error: ${r.status}`);
  return r.json();
}

export async function updateClient(pageId, { mrr, mesiAttivi }) {
  const r = await fetch(BASE, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pageId, mrr, mesiAttivi }),
  });
  if (!r.ok) throw new Error(`Notion update error: ${r.status}`);
  return r.json();
}
