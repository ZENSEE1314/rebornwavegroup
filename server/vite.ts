import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";
import { storage } from "./storage";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

/** Inject dynamic SEO meta tags into an HTML string based on the request path */
async function injectSeoMeta(html: string, reqPath: string): Promise<string> {
  try {
    // Normalise: strip query + hash, collapse to known paths
    const cleanPath = reqPath.split("?")[0].split("#")[0] || "/";
    const seo = await storage.getSeoPageByPath(cleanPath);
    if (!seo) return html;

    const title = seo.title;
    const description = seo.description;
    const keywords = seo.keywords || "";
    const ogTitle = seo.ogTitle || title;
    const ogDesc = seo.ogDescription || description;
    const ogImage = seo.ogImage || "";

    const metaBlock = `
    <title>${title}</title>
    <meta name="description" content="${description}" />
    ${keywords ? `<meta name="keywords" content="${keywords}" />` : ""}
    <meta property="og:title" content="${ogTitle}" />
    <meta property="og:description" content="${ogDesc}" />
    <meta property="og:type" content="website" />
    ${ogImage ? `<meta property="og:image" content="${ogImage}" />` : ""}
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${ogTitle}" />
    <meta name="twitter:description" content="${ogDesc}" />
    ${ogImage ? `<meta name="twitter:image" content="${ogImage}" />` : ""}`;

    // Replace existing <title> and any existing description meta
    return html
      .replace(/<title>[^<]*<\/title>/, "")
      .replace(/<meta\s+name="description"[^>]*>/i, "")
      .replace("</head>", `${metaBlock}\n  </head>`);
  } catch {
    return html; // never crash on SEO errors
  }
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      template = await injectSeoMeta(template, url);
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  // Try multiple possible paths for the built client files
  const candidatePaths = [
    path.resolve(process.cwd(), "dist/public"),
    path.resolve(import.meta.dirname, "public"),
    path.resolve(import.meta.dirname, "../dist/public"),
  ];

  let distPath: string | null = null;
  for (const candidate of candidatePaths) {
    console.log(`[static] Checking path: ${candidate} — exists: ${fs.existsSync(candidate)}`);
    if (fs.existsSync(candidate)) {
      distPath = candidate;
      break;
    }
  }

  if (!distPath) {
    console.error(`[static] Could not find build directory. Tried: ${candidatePaths.join(", ")}`);
    app.use("*", (_req, res) => {
      res.status(503).send("App is starting up — build files not found. Please try again shortly.");
    });
    return;
  }

  // Read the built index.html once
  const indexPath = path.resolve(distPath, "index.html");
  const baseHtml = fs.existsSync(indexPath)
    ? fs.readFileSync(indexPath, "utf-8")
    : null;

  console.log(`[static] Serving static files from: ${distPath}`);
  app.use(express.static(distPath));

  // fall through to index.html, injecting live SEO meta tags
  app.use("*", async (req, res) => {
    if (!baseHtml) {
      return res.sendFile(path.resolve(distPath!, "index.html"));
    }
    const html = await injectSeoMeta(baseHtml, req.originalUrl);
    res.status(200).set({ "Content-Type": "text/html" }).end(html);
  });
}
