# SwotStudios Revenue Dashboard

Dashboard per proiezione fatturato mensile, collegata a Notion.

## Setup locale

```bash
npm install
cp .env.example .env.local
# Compila NOTION_TOKEN e NOTION_DATABASE_ID in .env.local
npm run dev
```

## Deploy su Vercel

1. Pusha il codice su GitHub (`swotstudios/dashboard`)
2. Vai su vercel.com → New Project → importa il repo
3. Aggiungi le variabili d'ambiente nel pannello Vercel:
   - `NOTION_TOKEN` → il tuo Integration Token di Notion
   - `NOTION_DATABASE_ID` → `ea04a175e76a4009893fd7e919a30c5f`
4. Deploy

## Come ottenere il NOTION_TOKEN

1. Vai su https://www.notion.so/my-integrations
2. Crea una nuova integration → copia il "Internal Integration Token"
3. Apri il database Progetti su Notion → ⋯ → Connections → aggiungi la tua integration

## Struttura

```
src/
  App.jsx              — layout principale
  components/
    MetricCard.jsx     — card metriche in alto
    ForecastChart.jsx  — grafico Chart.js
    ClientRow.jsx      — riga cliente editabile
  lib/
    notion.js          — client API
    forecast.js        — calcoli proiezione e trendline
api/
  notion.js            — Vercel serverless function (proxy Notion)
```
