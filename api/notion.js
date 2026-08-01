// api/notion.js — Vercel Serverless Function

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

async function parseBody(req) {
  // Vercel may auto-parse as object, or leave as string/stream
  if (req.body !== undefined && req.body !== null && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return req.body;
  }
  const raw = Buffer.isBuffer(req.body)
    ? req.body.toString('utf8')
    : typeof req.body === 'string'
    ? req.body
    : await readRawBody(req);
  return JSON.parse(raw || '{}');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const NOTION_TOKEN = process.env.NOTION_TOKEN;
  const DATABASE_ID  = process.env.NOTION_DATABASE_ID;

  if (!NOTION_TOKEN || !DATABASE_ID) {
    return res.status(500).json({ error: 'Missing env vars' });
  }

  const headers = {
    'Authorization': `Bearer ${NOTION_TOKEN}`,
    'Notion-Version': '2022-06-28',
    'Content-Type': 'application/json',
  };

  // ── GET → list all clients ──────────────────────────────────────────────
  if (req.method === 'GET') {
    let allResults = [];
    let cursor;

    do {
      const body = {
        page_size: 100,
        sorts: [{ property: 'Cliente', direction: 'ascending' }],
        ...(cursor ? { start_cursor: cursor } : {}),
      };
      const r = await fetch(`https://api.notion.com/v1/databases/${DATABASE_ID}/query`, {
        method: 'POST', headers, body: JSON.stringify(body),
      });
      if (!r.ok) return res.status(r.status).json(await r.json());
      const data = await r.json();
      allResults = allResults.concat(data.results);
      cursor = data.has_more ? data.next_cursor : undefined;
    } while (cursor);

    const clients = allResults.map(page => {
      const p = page.properties;
      return {
        id:          page.id,
        nome:        p.Cliente?.title?.[0]?.plain_text ?? '—',
        servizi:     p.Servizio?.multi_select?.map(s => s.name) ?? [],
        stato:       p['Stato Lavori']?.multi_select?.map(s => s.name) ?? [],
        mrr:         parseFloat(p.MRR?.rich_text?.[0]?.plain_text ?? '0') || 0,
        mesiAttivi:  p['Mesi Attivi']?.multi_select?.map(s => s.name) ?? [],
        categoria:   p.Categoria?.multi_select?.map(s => s.name) ?? [],
        notionUrl:   page.url,
      };
    });

    return res.status(200).json(clients);
  }

  // ── PATCH → update Mesi Attivi for a page ──────────────────────────────
  if (req.method === 'PATCH') {
    let body;
    try {
      body = await parseBody(req);
    } catch {
      return res.status(400).json({ error: 'Invalid request body' });
    }

    const { pageId, mesiAttivi } = body;
    if (!pageId) return res.status(400).json({ error: 'pageId required' });
    if (!Array.isArray(mesiAttivi)) return res.status(400).json({ error: 'mesiAttivi must be an array' });

    const r = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        properties: {
          'Mesi Attivi': { multi_select: mesiAttivi.map(m => ({ name: m })) },
        },
      }),
    });

    if (!r.ok) return res.status(r.status).json(await r.json());
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
