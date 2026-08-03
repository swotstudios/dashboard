// api/notion.js — Vercel Serverless Function (read-only)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const NOTION_TOKEN    = process.env.NOTION_TOKEN;
  const PROGETTI_DB_ID  = process.env.NOTION_DATABASE_ID;
  const FATTURE_DB_ID   = process.env.NOTION_FATTURE_DB_ID;

  if (!NOTION_TOKEN || !PROGETTI_DB_ID || !FATTURE_DB_ID) {
    return res.status(500).json({ error: 'Missing env vars' });
  }

  const headers = {
    'Authorization': `Bearer ${NOTION_TOKEN}`,
    'Notion-Version': '2022-06-28',
    'Content-Type': 'application/json',
  };

  async function queryAll(dbId, extraBody = {}) {
    const results = [];
    let cursor;
    do {
      const body = { page_size: 100, ...extraBody, ...(cursor ? { start_cursor: cursor } : {}) };
      const r = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
        method: 'POST', headers, body: JSON.stringify(body),
      });
      if (!r.ok) {
        const err = await r.json();
        throw { status: r.status, body: err };
      }
      const data = await r.json();
      results.push(...data.results);
      cursor = data.has_more ? data.next_cursor : undefined;
    } while (cursor);
    return results;
  }

  try {
    // Fetch Progetti and Fatture in parallel
    const [progettiRaw, fattureRaw] = await Promise.all([
      queryAll(PROGETTI_DB_ID, { sorts: [{ property: 'Cliente', direction: 'ascending' }] }),
      queryAll(FATTURE_DB_ID,  { sorts: [{ property: 'Mese di competenza', direction: 'ascending' }] }),
    ]);

    // Build progetti lookup map: pageId → { nome, servizi, stato, categoria, notionUrl }
    const progettiMap = {};
    for (const page of progettiRaw) {
      const p = page.properties;
      progettiMap[page.id] = {
        nome:      p.Cliente?.title?.[0]?.plain_text ?? '—',
        servizi:   p.Servizio?.multi_select?.map(s => s.name) ?? [],
        stato:     p['Stato Lavori']?.multi_select?.map(s => s.name) ?? [],
        categoria: p.Categoria?.multi_select?.map(s => s.name) ?? [],
        notionUrl: page.url,
      };
    }

    // Map Fatture rows, denormalising the Progetto relation
    const fatture = fattureRaw.map(page => {
      const p = page.properties;

      // Relation returns an array of { id }
      const progettoId = p.Progetto?.relation?.[0]?.id ?? null;
      const progetto   = progettoId ? progettiMap[progettoId] : null;

      // Mese di competenza: date field, we only need YYYY-MM
      const meseRaw = p['Mese di competenza']?.date?.start ?? null;
      const meseCompetenza = meseRaw ? meseRaw.slice(0, 7) : null;

      return {
        id:             page.id,
        progettoId,
        tipoVoce:       p['Tipo Voce']?.select?.name ?? null,
        meseCompetenza,
        importo:        p['Importo']?.number ?? 0,
        stato:          p['Stato']?.select?.name ?? null,
        note:           p['Note']?.rich_text?.[0]?.plain_text ?? '',
        // denormalised from Progetto
        cliente:        progetto?.nome      ?? '—',
        servizi:        progetto?.servizi   ?? [],
        statoLavori:    progetto?.stato     ?? [],
        categoria:      progetto?.categoria ?? [],
        notionUrl:      progetto?.notionUrl ?? page.url,
        progettoUrl:    progetto?.notionUrl ?? null,
      };
    });

    // Also expose a deduplicated client list for the table
    const clientiMap = {};
    for (const f of fatture) {
      if (!f.progettoId) continue;
      if (!clientiMap[f.progettoId]) {
        clientiMap[f.progettoId] = {
          progettoId:  f.progettoId,
          cliente:     f.cliente,
          servizi:     f.servizi,
          statoLavori: f.statoLavori,
          categoria:   f.categoria,
          notionUrl:   f.progettoUrl,
        };
      }
    }

    return res.status(200).json({
      fatture,
      clienti: Object.values(clientiMap),
    });
  } catch (e) {
    if (e.status) return res.status(e.status).json(e.body);
    return res.status(500).json({ error: String(e) });
  }
}
