# Airtop MCP Server

A Model Context Protocol (MCP) server that provides tools for interacting with Airtop's browser automation service.

## Installation

```bash
npm install airtop-mcp
```

## Usage

### Development

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set your Airtop API key:
   ```bash
   export AIRTOP_API_KEY=your_api_key_here
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

### Production

1. Install globally:
   ```bash
   npm install -g airtop-mcp
   ```
2. Set your Airtop API key:
   ```bash
   export AIRTOP_API_KEY=your_api_key_here
   ```
3. Start the server:
   ```bash
   airtop-mcp
   ```

## Available Tools

- `createSession`: Create a new Airtop browser session
- `createWindow`: Create a new browser window in the session
- `pageQuery`: Query the current page content using AI
- `terminateSession`: Terminate an Airtop browser session

## Configuration

The server runs on port 3456 by default. You can change this by setting the `PORT` environment variable.

## License

ISC
