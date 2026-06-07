// api/notion.js  — Vercel Serverless Function
// Proxies requests to the Notion API so the token never hits the browser.

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const NOTION_TOKEN = process.env.NOTION_TOKEN;
  const DATABASE_ID  = process.env.NOTION_DATABASE_ID;

  if (!NOTION_TOKEN || !DATABASE_ID) {
    return res.status(500).json({ error: 'Missing NOTION_TOKEN or NOTION_DATABASE_ID env vars' });
  }

  const headers = {
    'Authorization': `Bearer ${NOTION_TOKEN}`,
    'Notion-Version': '2022-06-28',
    'Content-Type': 'application/json',
  };

  // ── GET /api/notion  →  list all pages in the database ──────────────────
  if (req.method === 'GET') {
    let allResults = [];
    let cursor = undefined;

    do {
      const body = {
        page_size: 100,
        sorts: [{ property: 'Cliente', direction: 'ascending' }],
        ...(cursor ? { start_cursor: cursor } : {}),
      };

      const r = await fetch(`https://api.notion.com/v1/databases/${DATABASE_ID}/query`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!r.ok) {
        const err = await r.json();
        return res.status(r.status).json(err);
      }

      const data = await r.json();
      allResults = allResults.concat(data.results);
      cursor = data.has_more ? data.next_cursor : undefined;
    } while (cursor);

    // Map raw Notion pages → clean objects
    const clients = allResults.map((page) => {
      const p = page.properties;
      return {
        id: page.id,
        nome: p.Cliente?.title?.[0]?.plain_text ?? '—',
        servizi: p.Servizio?.multi_select?.map((s) => s.name) ?? [],
        stato: p['Stato Lavori']?.multi_select?.map((s) => s.name) ?? [],
        mrr: parseFloat(p.MRR?.rich_text?.[0]?.plain_text ?? '0') || 0,
        mesiAttivi: p['Mesi Attivi']?.multi_select?.map((s) => s.name) ?? [],
        categoria: p.Categoria?.multi_select?.map((s) => s.name) ?? [],
        notionUrl: page.url,
      };
    });

    return res.status(200).json(clients);
  }

  // ── PATCH /api/notion  →  update a single page (MRR + Mesi Attivi) ──────
  if (req.method === 'PATCH') {
    const { pageId, mrr, mesiAttivi } = req.body;
    if (!pageId) return res.status(400).json({ error: 'pageId required' });

    const properties = {};
    if (mrr !== undefined) {
      properties['MRR'] = {
        rich_text: [{ type: 'text', text: { content: String(mrr) } }],
      };
    }
    if (mesiAttivi !== undefined) {
      properties['Mesi Attivi'] = {
        multi_select: mesiAttivi.map((m) => ({ name: m })),
      };
    }

    const r = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ properties }),
    });

    if (!r.ok) {
      const err = await r.json();
      return res.status(r.status).json(err);
    }

    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
