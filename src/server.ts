import { AirtopClient } from "@airtop/sdk";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
const PORT = 3456; // Unique port number

interface CreateWindowParams {
  sessionId: string;
  url: string;
}

interface PageQueryParams {
  sessionId: string;
  windowId: string;
  prompt: string;
}

interface TerminateSessionParams {
  sessionId: string;
}

async function main() {
  const apiKey = process.env.AIRTOP_API_KEY;
  if (!apiKey) {
    throw new Error("AIRTOP_API_KEY environment variable is required");
  }

  const server = new McpServer({
    version: "1.0.0",
    port: PORT,
    name: "airtop-mcp",
    description: "MCP server for Airtop integration",
  });

  // Initialize Airtop client
  const airtopClient = new AirtopClient({
    apiKey,
  });

  // Register tools
  server.tool(
    "createSession",
    "Create a new Airtop browser session",
    async () => {
      const session = await airtopClient.sessions.create();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(session.data),
          },
        ],
      };
    },
  );
  server.tool(
    "createWindow",
    "Create a new browser window in the session",
    {
      sessionId: z.string(),
      url: z.string(),
    },
    async ({ sessionId, url }: { sessionId: string; url: string }) => {
      const window = await airtopClient.windows.create(sessionId, { url });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(window.data),
          },
        ],
      };
    },
  );

  server.tool(
    "pageQuery",
    "Query the current page content using AI",
    {
      sessionId: z.string().describe("The session ID"),
      windowId: z.string().describe("The window ID"),
      prompt: z.string().describe("The AI prompt to use"),
    },
    async ({
      sessionId,
      windowId,
      prompt,
    }: {
      sessionId: string;
      windowId: string;
      prompt: string;
    }) => {
      const contentSummary = await airtopClient.windows.pageQuery(
        sessionId,
        windowId,
        {
          prompt,
        },
      );
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(contentSummary.data),
          },
        ],
      };
    },
  );

  server.tool(
    "terminateSession",
    "Terminate an Airtop browser session",
    {
      sessionId: z.string().describe("The session ID"),
    },
    async ({ sessionId }: { sessionId: string }) => {
      await airtopClient.sessions.terminate(sessionId);
      return {
        content: [
          {
            type: "text",
            text: "Session terminated successfully",
          },
        ],
      };
    },
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log(`MCP server running on port ${PORT}`);
}

main().catch(console.error);
