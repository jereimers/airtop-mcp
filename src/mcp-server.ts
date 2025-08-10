import { AirtopClient, AirtopError } from "@airtop/sdk";
import { Issue } from "@airtop/sdk/api/index.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { z } from "zod";

// Define the expected response type for uploadFileAndSelectInput
interface UploadFileResponse {
  fileId: string;
  [key: string]: unknown;
}

// Session tracking for profile management
interface SessionMetadata {
  sessionId: string;
  profileName?: string;
  createdAt: Date;
}

// Configuration interface for createSessionWithOptions
interface SessionOptionsConfig {
  profileName?: string;
  proxy?: boolean | object;
  solveCaptcha?: boolean;
  timeoutMinutes?: number;
  extensionIds?: string[];
  baseProfileId?: string;
}

export function createMcpServer(apiKey: string, port: number) {
  // Session tracking for profile management
  const sessionRegistry = new Map<string, SessionMetadata>();

  const server = new McpServer(
    {
      version: "1.0.0",
      port,
      name: "airtop-mcp",
      description: `MCP server for Airtop integration`,
    },
    {
      instructions: `
    This server is used to create and manage browser sessions and windows using the Airtop API, 
    which is a browser automation tool that lets you control a browser from a remote server.

    You can create a session using the "createSession" tool, which gives you access to a single browser,
    returning JSON with a session ID.

    Once you have a session, you can create windows using the "createWindow" tool.
    This returns JSON with a window ID.

    You can query the content of a window using the "pageQuery" tool, passing in the session ID and window ID.
    This returns JSON with a content summary.

    You can also let the user interact with the window using the "getWindowInfo" tool,
    which returns a live view URL that you can share with the user, for them to interact with the window.

    Try to reuse the same session and windows for multiple queries to save on costs.`,
    },
  );

  // Initialize Airtop client
  const airtopClient = new AirtopClient({
    apiKey,
  });

  // Register tools
  server.tool(
    "createSession",
    "Create a new Airtop browser session",
    async () => {
      console.warn("createSession request");
      const session = await airtopClient.sessions.create();
      if (session.errors) {
        return reportAirtopErrors(session.errors);
      }
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
    "createSessionWithOptions",
    "Create a new Airtop browser session with custom configuration options",
    {
      configuration: z.object({
        profileName: z.string().optional().describe("Name of profile to load/save - profile will be saved on termination"),
        proxy: z.union([
          z.boolean().describe("Use Airtop-provided proxy"),
          z.object({}).describe("Custom proxy configuration")
        ]).optional().describe("Proxy configuration"),
        solveCaptcha: z.boolean().optional().describe("Automatically solve captcha challenges"),
        timeoutMinutes: z.number().optional().describe("Session timeout in minutes (default: 10)"),
        extensionIds: z.array(z.string()).optional().describe("Google Web Store extension IDs to load"),
        baseProfileId: z.string().optional().describe("Deprecated: Use profileName instead")
      }).optional().describe("Session configuration options")
    },
    async ({ configuration }: { configuration?: SessionOptionsConfig }) => {
      // Log only non-sensitive fields to avoid exposing credentials
      const { profileName, solveCaptcha, timeoutMinutes, extensionIds } = configuration || {};
      console.warn("createSessionWithOptions request", { profileName, solveCaptcha, timeoutMinutes, extensionIds });
      
      // Create session with configuration
      const sessionRequest = configuration ? { configuration } : {};
      const session = await airtopClient.sessions.create(sessionRequest);
      
      if (session.errors) {
        return reportAirtopErrors(session.errors);
      }

      // Track session for profile management
      if (session.data?.id && configuration?.profileName) {
        sessionRegistry.set(session.data.id, {
          sessionId: session.data.id,
          profileName: configuration.profileName,
          createdAt: new Date()
        });
        
        // Set up profile saving on termination
        try {
          await airtopClient.sessions.saveProfileOnTermination(
            session.data.id, 
            configuration.profileName
          );
          console.warn(`Profile saving configured for session ${session.data.id} with profile ${configuration.profileName}`);
        } catch (error) {
          console.warn(`Failed to configure profile saving: ${String(error)}`);
          // Don't fail the session creation, just log the warning
        }
      }

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
      console.warn("createWindow request", sessionId, url);
      const window = await airtopClient.windows.create(sessionId, { url });
      if (window.errors?.length) {
        return reportAirtopErrors(window.errors);
      }
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
      console.warn("pageQuery request", prompt);
      try {
        const contentSummary = await airtopClient.windows.pageQuery(
          sessionId,
          windowId,
          {
            prompt,
          },
        );
        console.warn("pageQuery response", contentSummary);
        if (contentSummary?.errors) {
          return reportAirtopErrors(contentSummary.errors);
        }
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(contentSummary.data),
            },
          ],
        };
      } catch (err) {
        console.error("pageQuery failed:", err);
        return {
          content: [
            {
              type: "text",
              text: `Internal error during pageQuery: ${String(err)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "terminateSession",
    "Terminate an Airtop browser session",
    {
      sessionId: z.string().describe("The session ID"),
    },
    async ({ sessionId }: { sessionId: string }) => {
      // Clean up session tracking
      sessionRegistry.delete(sessionId);
      
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
  server.tool(
    "getWindowInfo",
    `Get information about a browser window, including a live view URL,
     which lets the user use and interact with the window. Use this to get a URL to share with the user,
     so they can log into a web site.`,
    {
      sessionId: z.string().describe("The session ID"),
      windowId: z.string().describe("The window ID"),
    },
    async ({
      sessionId,
      windowId,
    }: {
      sessionId: string;
      windowId: string;
    }) => {
      const window = await airtopClient.windows.getWindowInfo(
        sessionId,
        windowId,
      );
      if (window.errors?.length) {
        return reportAirtopErrors(window.errors);
      }
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
  // tool for airtopClient.windows.paginatedExtraction
  server.tool(
    "paginatedExtraction",
    "Extract data from a paginated list",
    {
      sessionId: z.string().describe("The session ID"),
      windowId: z.string().describe("The window ID"),
      prompt: z.string().describe("The AI prompt to use"),
      outputSchema: z.string().describe("JSONSchema for the output").optional(),
    },
    async ({
      sessionId,
      windowId,
      prompt,
      outputSchema,
    }: {
      sessionId: string;
      windowId: string;
      prompt: string;
      outputSchema?: string | undefined;
    }) => {
      const data = await airtopClient.windows.paginatedExtraction(
        sessionId,
        windowId,
        {
          prompt,
          configuration: {
            outputSchema,
          },
        },
      );
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data),
          },
        ],
      };
    },
  );
  
  // Basic UI Automation Tools
  server.tool(
    "click",
    "Click on an element in the browser window using AI description",
    {
      sessionId: z.string().describe("The session ID"),
      windowId: z.string().describe("The window ID"),
      elementDescription: z.string().describe("Natural language description of the element to click (e.g., 'the login button', 'submit button')"),
      coordinate: z.object({
        x: z.number(),
        y: z.number()
      }).optional().describe("Optional exact coordinates to click")
    },
    async ({ sessionId, windowId, elementDescription, coordinate }: {
      sessionId: string;
      windowId: string;
      elementDescription: string;
      coordinate?: { x: number; y: number };
    }) => {
      console.warn("click request", elementDescription, coordinate);
      
      const clickRequest = coordinate 
        ? { coordinate, elementDescription }
        : { elementDescription };
      try {
        const result = await airtopClient.windows.click(sessionId, windowId, clickRequest);
        if (result?.errors) {
          return reportAirtopErrors(result.errors);
        }
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result.data),
            },
          ],
        };
      } catch (err) {
        console.error("click failed:", err);
        return {
          content: [
            {
              type: "text",
              text: `Internal error during click: ${String(err)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "scroll",
    "Scroll in the browser window",
    {
      sessionId: z.string().describe("The session ID"),
      windowId: z.string().describe("The window ID"),
      elementDescription: z.string().optional().describe("Element to scroll to (natural language description)"),
    },
    async ({ sessionId, windowId, elementDescription }: {
      sessionId: string;
      windowId: string;
      elementDescription?: string;
    }) => {
      console.warn("scroll request", elementDescription);
      
      // Simple scroll implementation - scroll to element or general scroll
      const scrollRequest = elementDescription 
        ? { scrollToElement: elementDescription }
        : {};
        
      const result = await airtopClient.windows.scroll(sessionId, windowId, scrollRequest);
      
      if (result.errors) {
        return reportAirtopErrors(result.errors);
      }
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result.data),
          },
        ],
      };
    },
  );

  server.tool(
    "type",
    "Type text into an element in the browser window",
    {
      sessionId: z.string().describe("The session ID"),
      windowId: z.string().describe("The window ID"),
      text: z.string().describe("Text to type"),
      elementDescription: z.string().optional().describe("Natural language description of the element to type into (e.g., 'the search box', 'email input field')")
    },
    async ({ sessionId, windowId, text, elementDescription }: {
      sessionId: string;
      windowId: string;
      text: string;
      elementDescription?: string;
    }) => {
      console.warn("type request", text, elementDescription);
      
      const typeRequest = {
        text,
        ...(elementDescription && { elementDescription })
      };
        
      const result = await airtopClient.windows.type(sessionId, windowId, typeRequest);
      
      if (result.errors) {
        return reportAirtopErrors(result.errors);
      }
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result.data),
          },
        ],
      };
    },
  );

  server.tool(
    "scrape",
    "Scrape/extract content from the browser window",
    {
      sessionId: z.string().describe("The session ID"),
      windowId: z.string().describe("The window ID"),
    },
    async ({ sessionId, windowId }: {
      sessionId: string;
      windowId: string;
    }) => {
      console.warn("scrape request");
      try {
        const result = await airtopClient.windows.scrapeContent(sessionId, windowId);
        if (result?.errors) {
          return reportAirtopErrors(result.errors);
        }
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result.data),
            },
          ],
        };
      } catch (err) {
        console.error("scrape failed:", err);
        return {
          content: [
            {
              type: "text",
              text: `Internal error during scrape: ${String(err)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "fileInput",
    "Upload a file to a file input element in the browser window",
    {
      sessionId: z.string().describe("The session ID"),
      windowId: z.string().describe("The window ID"),
      elementDescription: z.string().describe("Natural language description of the file input element (e.g., 'file upload button', 'browse files input')"),
      filePath: z.string().describe("Local path to the file to upload")
    },
    async ({ sessionId, windowId, elementDescription, filePath }: {
      sessionId: string;
      windowId: string;
      elementDescription: string;
      filePath: string;
    }) => {
      try {
        const result: UploadFileResponse = await airtopClient.windows.uploadFileAndSelectInput(
          sessionId, 
          windowId, 
          {
            elementDescription,
            uploadFilePath: filePath
          }
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ 
                fileId: result.fileId, 
                success: true,
                message: "File uploaded successfully" 
              }),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `File upload failed: ${String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "monitorForCondition",
    "Monitor the browser window for specific conditions or changes",
    {
      sessionId: z.string().describe("The session ID"),
      windowId: z.string().describe("The window ID"),
      condition: z.string().describe("Natural language description of the condition to monitor for (e.g., 'wait for page to load', 'wait for login to complete')"),
      timeoutSeconds: z.number().optional().default(30).describe("Timeout in seconds (default: 30)")
    },
    async ({ sessionId, windowId, condition, timeoutSeconds = 30 }: {
      sessionId: string;
      windowId: string;
      condition: string;
      timeoutSeconds?: number;
    }) => {
      console.warn("monitorForCondition request", condition, timeoutSeconds);
        
      const result = await airtopClient.windows.monitor(sessionId, windowId, {
        condition,
        timeThresholdSeconds: timeoutSeconds
      });
      
      if (result.errors) {
        return reportAirtopErrors(result.errors);
      }
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result.data),
          },
        ],
      };
    },
  );

  return server;
}
export function reportAirtopErrors(errors: AirtopError[] | Issue[]) {
  // Log the raw errors for debugging purposes
  try {
    console.error("Airtop API returned errors:", errors);
  } catch (_) {
    // ignore logging issues
  }

  const formatted =
    Array.isArray(errors) && errors.length > 0
      ? errors
          .map((e) => {
            if (!e) return "Unknown error (empty)";
            // If it's an object with a message property
            // prefer that, otherwise JSON stringify the entry
            // also handle plain strings
            if (typeof e === "string") return e;
            // @ts-ignore
            return e.message ?? JSON.stringify(e);
          })
          .join("\n")
      : String(errors);

  return {
    content: [
      {
        type: "text",
        text: `Errors from the API:\n${formatted}`,
      } as const,
    ],
    isError: true,
  };
}
