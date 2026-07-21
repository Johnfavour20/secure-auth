import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import { createProxyMiddleware } from "http-proxy-middleware";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const port = process.env.PORT || 8080;
const FLASK_PORT = 5000;

// ---------------------------------------------------------------------------
// Start the Flask backend as a subprocess
// ---------------------------------------------------------------------------
const flaskProcess = spawn("python", ["backend/app.py"], {
  cwd: __dirname,
  env: {
    ...process.env,
    FLASK_ENV: "production",
    PORT: String(FLASK_PORT),
  },
  stdio: "inherit",
});

flaskProcess.on("spawn", () => {
  console.log(`Flask backend starting on port ${FLASK_PORT}...`);
});

flaskProcess.on("error", (err) => {
  console.error("Failed to start Flask backend:", err);
});

flaskProcess.on("exit", (code, signal) => {
  console.error(
    `Flask backend exited with code ${code} (signal: ${signal ?? "none"})`
  );
});

process.on("exit", () => {
  flaskProcess.kill();
});
process.on("SIGINT", () => {
  flaskProcess.kill();
  process.exit();
});
process.on("SIGTERM", () => {
  flaskProcess.kill();
  process.exit();
});

// ---------------------------------------------------------------------------
// Express server
// ---------------------------------------------------------------------------
const app = express();

const distPath = path.join(__dirname, "dist");

// Proxy all /api/* requests to the Flask backend, preserving method,
// headers, body, and query params.
app.use(
  "/api",
  createProxyMiddleware({
    target: `http://localhost:${FLASK_PORT}`,
    changeOrigin: true,
  })
);

app.use(express.static(distPath));

// Catch-all route for React Router (SPA)
app.get("*", (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
