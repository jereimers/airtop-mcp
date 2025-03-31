#!/usr/bin/env node

import { spawn } from "child_process";
import { join } from "path";

const serverPath = join(__dirname, "server.js");

const server = spawn("node", [serverPath], {
  stdio: "inherit",
  env: {
    ...process.env,
    NODE_ENV: "production",
  },
});

server.on("error", (err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

server.on("exit", (code) => {
  process.exit(code ?? 0);
});
