interface Env {
  DB: D1Database;
}

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

    if (request.method === "POST" && url.pathname === "/ping") {
      try {
        const body = await request.json() as { version?: string; os?: string };
        const version = String(body.version || "unknown").slice(0, 32);
        const os = String(body.os || "unknown").slice(0, 32);
        const date = new Date().toISOString().slice(0, 10);

        await env.DB.prepare(
          `INSERT INTO events (date, version, os, count) VALUES (?, ?, ?, 1)
           ON CONFLICT (date, version, os) DO UPDATE SET count = count + 1`
        ).bind(date, version, os).run();

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

      const platforms = await env.DB.prepare(
        `SELECT os, SUM(count) as total FROM events WHERE date >= ? GROUP BY os ORDER BY total DESC`
      ).bind(since).all();

      return new Response(JSON.stringify({
        daily: daily.results,
        versions: versions.results,
        platforms: platforms.results,
      }, null, 2), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    return new Response("not found", { status: 404, headers: cors });
  },
};
