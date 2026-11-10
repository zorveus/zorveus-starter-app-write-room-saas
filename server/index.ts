import { existsSync } from "node:fs";
import { createServer as createHttpServer } from "node:http";
import { resolve } from "node:path";
import express from "express";
import { readConfig } from "./config.js";
import { baseConfig } from "../base/config.js";
import { createApi } from "./api.js";
import { createBilling } from "./zorveus.js";

// Node's loader keeps .env values server-only and does not overwrite injected variables.
if (existsSync(".env")) process.loadEnvFile(".env");
const production =
  process.argv.includes("--production") ||
  process.env.NODE_ENV === "production";
const config = process.argv.includes("--base")
  ? baseConfig(process.env)
  : readConfig(process.env);
const api = createApi(
  config,
  config.ready ? createBilling(config) : null,
  !production,
);
const app = express();
const httpServer = createHttpServer(app);
app.disable("x-powered-by");
app.use("/api", express.json({ limit: "32kb" }));
app.use("/api", async (req, res) => {
  // Bind to loopback and ignore forwarded host/protocol. Never trust proxy headers by default.
  const host = req.headers.host || "localhost:3000";
  if (
    !["localhost", "127.0.0.1", "[::1]"].includes(
      new URL(`http://${host}`).hostname,
    )
  ) {
    res
      .status(403)
      .json({
        error: {
          message: "Use the local app address.",
          code: "host_denied",
          status: 403,
        },
      });
    return;
  }
  const request = new Request(`http://${host}${req.originalUrl}`, {
    method: req.method,
    headers: new Headers(
      Object.entries(req.headers).flatMap(([key, value]) =>
        value === undefined
          ? []
          : [[key, Array.isArray(value) ? value.join(", ") : value]],
      ),
    ),
    ...(req.method !== "GET" && req.method !== "HEAD"
      ? { body: JSON.stringify(req.body ?? {}) }
      : {}),
  });
  try {
    const response = await api(request);
    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));
    res.send(await response.text());
  } catch {
    res
      .status(500)
      .json({
        error: {
          message: "The server could not complete this request.",
          code: "internal_error",
          status: 500,
        },
      });
  }
});
if (production) {
  app.use(express.static(resolve("dist")));
  app.get("/{*path}", (_req, res) => res.sendFile(resolve("dist/index.html")));
} else {
  const { createServer } = await import("vite");
  const vite = await createServer({
    server: { middlewareMode: true, hmr: { server: httpServer } },
    appType: "spa",
  });
  app.use(vite.middlewares);
}
app.use(
  (
    error: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    const status =
      typeof error === "object" &&
      error &&
      "status" in error &&
      error.status === 413
        ? 413
        : 400;
    res
      .status(status)
      .json({
        error: {
          message: "The request body is invalid or too large.",
          code: "invalid_body",
          status,
        },
      });
  },
);
const port = Number(process.env.PORT || 3000);
httpServer.listen(port, "127.0.0.1", () => {
  console.log(`Write room: http://127.0.0.1:${port}`);
  console.log(
    config.ready
      ? "Server configuration loaded. Sign in to read the live allowance."
      : "Setup required. Open the app for the missing variable names.",
  );
});
