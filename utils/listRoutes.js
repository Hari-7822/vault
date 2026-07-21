const extractRoutes = (app) => {
  const routes = [];

  app._router.stack.forEach((layer) => {
    if (layer.route) {
      routes.push({
        methods: Object.keys(layer.route.methods).map((m) => m.toUpperCase()),
        path:    layer.route.path,
      });
      return;
    }

    if (layer.name === "router" && layer.handle?.stack) {
      const mountPath = layer.regexp.source
        .replace("^\\/", "/")
        .replace("\\/(?=\\/|$)i", "")
        .replace(/\\\//g, "/")
        .replace("/?(?=/|$)", "")
        .replace(/\(\?:\(\[^\\\/\]\+\?\)\)/g, ":param") 
        .split("(?")[0]                                   
        .replace(/\\/g, "")
        .replace(/\/+$/, "");                             

      layer.handle.stack.forEach((handler) => {
        if (!handler.route) return;
        const methods  = Object.keys(handler.route.methods).map((m) => m.toUpperCase());
        const subPath  = handler.route.path;
        const fullPath = mountPath + subPath;
        routes.push({ methods, path: fullPath });
      });
    }
  });

  return routes.sort((a, b) => a.path.localeCompare(b.path));
};

const METHOD_COLORS = {
  GET:    "#61affe",
  POST:   "#49cc90",
  PATCH:  "#fca130",
  PUT:    "#fca130",
  DELETE: "#f93e3e",
};

const badge = (method) => {
  const color = METHOD_COLORS[method] || "#999";
  return `<span style="background:${color};color:#fff;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:700;font-family:monospace;min-width:60px;display:inline-block;text-align:center">${method}</span>`;
};

export const registerRouteIndex = (app) => {
  app.get("/routes", (req, res) => {
    const routes = extractRoutes(app);
    res.json({
      success: true,
      total:   routes.length,
      routes,
    });
  });

  app.get("/", (req, res) => {
    const routes  = extractRoutes(app);
    const grouped = {};

    routes.forEach(({ methods, path }) => {
      const group = path.split("/")[1] || "root";
      if (!grouped[group]) grouped[group] = [];
      grouped[group].push({ methods, path });
    });

    const sections = Object.entries(grouped).map(([group, items]) => `
      <div class="group">
        <h2>/${group}</h2>
        ${items.map(({ methods, path }) => `
          <div class="route">
            <div class="badges">${methods.map(badge).join(" ")}</div>
            <code>${path}</code>
          </div>
        `).join("")}
      </div>
    `).join("");

    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>API Routes — Delivery Partner</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #0f0f13; color: #e0e0e8; min-height: 100vh; padding: 40px 24px; }
    .header { max-width: 860px; margin: 0 auto 40px; border-bottom: 1px solid #2a2a38; padding-bottom: 24px; }
    .header h1 { font-size: 26px; font-weight: 700; color: #fff; }
    .header p  { color: #6b6b80; font-size: 14px; margin-top: 6px; }
    .badge-total { display: inline-block; background: #252535; border: 1px solid #3a3a50; border-radius: 20px; padding: 2px 12px; font-size: 12px; color: #a0a0c0; margin-top: 10px; }
    .content { max-width: 860px; margin: 0 auto; display: flex; flex-direction: column; gap: 32px; }
    .group h2 { font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: .1em; color: #6b6b80; margin-bottom: 10px; border-left: 3px solid #3a3a60; padding-left: 10px; }
    .route { display: flex; align-items: center; gap: 14px; padding: 10px 14px; background: #16161f; border: 1px solid #2a2a38; border-radius: 8px; margin-bottom: 6px; }
    .route:hover { border-color: #3a3a58; background: #1c1c28; }
    .badges { display: flex; gap: 4px; flex-shrink: 0; min-width: 72px; }
    code { font-family: "Fira Code", "Cascadia Code", monospace; font-size: 13px; color: #c8c8e0; }
    .json-link { position: fixed; bottom: 24px; right: 24px; background: #252535; border: 1px solid #3a3a50; border-radius: 8px; padding: 8px 14px; font-size: 12px; color: #a0a0c0; text-decoration: none; }
    .json-link:hover { color: #fff; border-color: #6060a0; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Delivery Partner API</h1>
    <p>All registered routes — ${new Date().toLocaleString()}</p>
    <span class="badge-total">${routes.length} endpoints</span>
  </div>
  <div class="content">${sections}</div>
  <a class="json-link" href="/routes">{ } JSON</a>
</body>
</html>`);
  });
};