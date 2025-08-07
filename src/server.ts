import dotenvx from "@dotenvx/dotenvx";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import express, { Request, Response } from "express";
import { createMcpServer } from "./mcp-server.js";
export const PORT = 3456; // Unique port number
const FALLBACK_VERSION = "1.0.3";

dotenvx.config({ quiet: true });

// TODO: add a tool to terminate a session
export async function main() {
  // Handle help and version arguments
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log(`
Airtop MCP Server v${process.env.npm_package_version || FALLBACK_VERSION}

A Model Context Protocol (MCP) server providing browser automation tools through Airtop.

Usage:
  airtop-mcp [options]

Options:
  --help, -h     Show this help message
  --version, -v  Show version information
  --listen       Start as HTTP server (default: stdio mode)

Environment Variables:
  AIRTOP_API_KEY  Required API key for Airtop service

For more information, visit: https://github.com/your-org/airtop-mcp
`);
    process.exit(0);
  }

  if (process.argv.includes("--version") || process.argv.includes("-v")) {
    console.log(process.env.npm_package_version || FALLBACK_VERSION);
    process.exit(0);
  }

  const apiKey = process.env.AIRTOP_API_KEY;
  if (!apiKey) {
    throw new Error("AIRTOP_API_KEY environment variable is required");
  }

  const server = createMcpServer(apiKey, PORT);
  const listen = process.argv.includes("--listen");

  if (listen) {
    const app = express();
    const transports: { [sessionId: string]: SSEServerTransport } = {};

    app.get("/sse", async (_: Request, res: Response) => {
      console.warn("sse request");
      const transport = new SSEServerTransport("/messages", res);
      transports[transport.sessionId] = transport;
      res.on("close", () => {
        delete transports[transport.sessionId];
      });
      await server.connect(transport);
    });

    app.post("/messages", async (req: Request, res: Response) => {
      const sessionId = req.query.sessionId as string;
      const transport = transports[sessionId];
      console.warn("post message request", sessionId, !!transport);
      if (transport) {
        await transport.handlePostMessage(req, res);
      } else {
        res.status(400).send("No transport found for sessionId");
      }
    });

    console.log(`MCP about to start on port ${PORT}`);
    const appServer = app.listen(PORT);
    const address = appServer.address();
    const addressString =
      typeof address === "string"
        ? address
        : `${address?.address}:${address?.port}`;
    console.warn(`MCP server running on ${addressString}`);
    return appServer;
  } else {
    console.warn("MCP server starting in stdio mode");
    const transport = new StdioServerTransport();
    await server.connect(transport);
    return null;
  }
}

main().catch(console.error);
