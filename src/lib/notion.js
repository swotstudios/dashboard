export async function fetchData() {
  const r = await fetch('/api/notion');
  if (!r.ok) throw new Error(`Notion fetch error: ${r.status}`);
  return r.json(); // { fatture, clienti }
}
