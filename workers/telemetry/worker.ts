interface Env {
  DB: D1Database;
}

const DASHBOARD_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Nubium telemetry</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 900px; margin: 40px auto; padding: 0 20px; color: #222; background: #faf9f6; }
  h1 { margin: 0 0 8px; }
  .sub { color: #666; margin-bottom: 24px; }
  .controls { margin-bottom: 16px; }
  .controls button { margin-right: 6px; padding: 4px 10px; border: 1px solid #ccc; background: #fff; cursor: pointer; border-radius: 4px; }
  .controls button.active { background: #4a6fa5; color: #fff; border-color: #4a6fa5; }
  section { margin-bottom: 28px; }
  h2 { font-size: 15px; text-transform: uppercase; letter-spacing: .05em; color: #888; margin-bottom: 8px; }
  table { border-collapse: collapse; width: 100%; font-size: 14px; }
  td, th { padding: 4px 10px; text-align: left; border-bottom: 1px solid #eee; }
  th { color: #888; font-weight: 500; }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
  .bar { background: #4a6fa5; height: 14px; border-radius: 2px; display: inline-block; vertical-align: middle; margin-right: 8px; }
  #daily { display: flex; align-items: flex-end; gap: 2px; height: 140px; border-bottom: 1px solid #ccc; padding-bottom: 2px; }
  #daily .col { background: #4a6fa5; flex: 1; min-width: 4px; position: relative; }
  #daily .col:hover::after { content: attr(data-tip); position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); background: #222; color: #fff; padding: 2px 6px; border-radius: 3px; white-space: nowrap; font-size: 12px; }
</style>
</head>
<body>
<h1>Nubium telemetry</h1>
<div class="sub">Anonymous launch pings. No IP, no user ID — just version + OS + platform.</div>

<div class="controls">
  <button data-days="7">7d</button>
  <button data-days="30" class="active">30d</button>
  <button data-days="90">90d</button>
  <button data-days="365">1y</button>
</div>

<section>
  <h2>Launches per day</h2>
  <div id="daily"></div>
</section>

<section>
  <h2>Platform</h2>
  <table id="platforms"></table>
</section>

<section>
  <h2>OS</h2>
  <table id="oss"></table>
</section>

<section>
  <h2>Version</h2>
  <table id="versions"></table>
</section>

<script>
async function load(days) {
  const r = await fetch('/stats?days=' + days);
  const d = await r.json();

  const maxDaily = Math.max(1, ...d.daily.map(x => x.total));
  document.getElementById('daily').innerHTML = d.daily.map(x =>
    '<div class="col" style="height:' + (x.total / maxDaily * 100) + '%" data-tip="' + x.date + ': ' + x.total + '"></div>'
  ).join('');

  const renderTable = (rows, keyField) => {
    const total = rows.reduce((s, r) => s + r.total, 0) || 1;
    return '<tr><th>' + keyField + '</th><th class="num">Count</th><th class="num">%</th></tr>' +
      rows.map(r => {
        const pct = (r.total / total * 100);
        return '<tr><td>' + (r[keyField] || 'unknown') + '</td>' +
               '<td class="num">' + r.total + '</td>' +
               '<td class="num"><span class="bar" style="width:' + pct + '%"></span>' + pct.toFixed(1) + '%</td></tr>';
      }).join('');
  };

  document.getElementById('platforms').innerHTML = renderTable(d.platforms || [], 'platform');
  document.getElementById('oss').innerHTML = renderTable(d.oss || [], 'os');
  document.getElementById('versions').innerHTML = renderTable(d.versions || [], 'version');
}

document.querySelectorAll('.controls button').forEach(b => {
  b.addEventListener('click', () => {
    document.querySelectorAll('.controls button').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    load(Number(b.dataset.days));
  });
});

load(30);
</script>
</body>
</html>`;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors });
    }

    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/") {
      return new Response(DASHBOARD_HTML, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    if (request.method === "POST" && url.pathname === "/ping") {
      try {
        const body = await request.json() as { version?: string; os?: string; platform?: string };
        const version = String(body.version || "unknown").slice(0, 32);
        const os = String(body.os || "unknown").slice(0, 32);
        const platform = String(body.platform || "unknown").slice(0, 16);
        const date = new Date().toISOString().slice(0, 10);

        await env.DB.prepare(
          `INSERT INTO events (date, version, os, platform, count) VALUES (?, ?, ?, ?, 1)
           ON CONFLICT (date, version, os, platform) DO UPDATE SET count = count + 1`
        ).bind(date, version, os, platform).run();

        return new Response("ok", { headers: cors });
      } catch {
        return new Response("error", { status: 400, headers: cors });
      }
    }

    if (request.method === "GET" && url.pathname === "/stats") {
      const days = Math.min(Number(url.searchParams.get("days") || 30), 365);
      const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

      const daily = await env.DB.prepare(
        `SELECT date, SUM(count) as total FROM events WHERE date >= ? GROUP BY date ORDER BY date`
      ).bind(since).all();

      const versions = await env.DB.prepare(
        `SELECT version, SUM(count) as total FROM events WHERE date >= ? GROUP BY version ORDER BY total DESC`
      ).bind(since).all();

      const oss = await env.DB.prepare(
        `SELECT os, SUM(count) as total FROM events WHERE date >= ? GROUP BY os ORDER BY total DESC`
      ).bind(since).all();

      const platforms = await env.DB.prepare(
        `SELECT platform, SUM(count) as total FROM events WHERE date >= ? GROUP BY platform ORDER BY total DESC`
      ).bind(since).all();

      return new Response(JSON.stringify({
        daily: daily.results,
        versions: versions.results,
        oss: oss.results,
        platforms: platforms.results,
      }, null, 2), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    return new Response("not found", { status: 404, headers: cors });
  },
};
