# Airtop MCP Server

A Model Context Protocol (MCP) server that provides advanced tools for interacting with Airtop's browser automation service. This enhanced version includes custom session management and comprehensive UI automation tools.

## Features

### Enhanced Session Management
- **`createSessionWithOptions`**: Create sessions with custom configurations including profiles, proxy settings, CAPTCHA solving, and timeouts
- **Profile Management**: Automatic profile saving and loading for consistent browser environments
- **Session Tracking**: Advanced session lifecycle management with cleanup

### UI Automation Tools
- **`click`**: Click on elements using natural language descriptions
- **`scroll`**: Scroll within browser windows with element targeting
- **`type`**: Type text into input fields with smart element detection
- **`scrape`**: Extract and scrape content from web pages
- **`fileInput`**: Upload files to file input elements
- **`monitorForCondition`**: Monitor browser state for specific conditions

### Core Tools
- **`createSession`**: Create a basic browser session
- **`createWindow`**: Create new browser windows
- **`pageQuery`**: AI-powered page content queries
- **`terminateSession`**: Clean session termination with profile saving
- **`getWindowInfo`**: Retrieve window information
- **`paginatedExtraction`**: Advanced data extraction from paginated content

## Installation & Usage

### Docker Container (Recommended)

#### Using Pre-built Image
```bash
# Pull and run the containerized version
docker run -i --rm -e AIRTOP_API_KEY=your_api_key_here airtop-mcp
```

#### Building Locally
```bash
# Clone the repository
git clone <repository-url>
cd airtop-mcp

# Build Docker image
npm run docker:build

# Run container
docker run -i --rm -e AIRTOP_API_KEY=your_api_key_here airtop-mcp
```

### Local Development

1. **Clone and Setup**:
   ```bash
   git clone <repository-url>
   cd airtop-mcp
   npm install
   ```

2. **Environment Configuration**:
   ```bash
   export AIRTOP_API_KEY=your_api_key_here
   ```

3. **Development Server**:
   ```bash
   npm run dev -- --server
   ```

4. **Build for Production**:
   ```bash
   npm run build
   ```

### VS Code Integration

For VS Code users, add to your `.vscode/mcp.json`:

```json
{
  "servers": {
    "airtop": {
      "type": "stdio",
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-e",
        "AIRTOP_API_KEY",
        "airtop-mcp"
      ],
      "env": {
        "AIRTOP_API_KEY": "${input:airtop_api_key}"
      }
    }
  },
  "inputs": [
    {
      "id": "airtop_api_key",
      "type": "promptString",
      "description": "Enter your Airtop API Key",
      "password": true
    }
  ]
}
```

### Claude Desktop Integration

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "airtop": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm", 
        "-e", "AIRTOP_API_KEY=your_api_key_here",
        "airtop-mcp"
      ]
    }
  }
}
```

## Tool Documentation

### Enhanced Session Management

#### `createSessionWithOptions`
Create browser sessions with advanced configuration:
- **profileName**: Custom browser profile for persistent settings
- **proxy**: Proxy configuration for network routing
- **solveCaptcha**: Automatic CAPTCHA solving capability
- **timeoutMinutes**: Custom session timeout duration
- **extensionIds**: Browser extensions to load

Example:
```json
{
  "profileName": "my-automation-profile",
  "solveCaptcha": true,
  "timeoutMinutes": 30,
  "proxy": {
    "server": "proxy.example.com:8080"
  }
}
```

### UI Automation Tools

#### `click`
Click elements using natural language descriptions:
```json
{
  "sessionId": "session_123",
  "windowId": "window_456", 
  "elementDescription": "the login button"
}
```

#### `type`
Type text into form fields:
```json
{
  "sessionId": "session_123",
  "windowId": "window_456",
  "text": "user@example.com",
  "elementDescription": "email input field"
}
```

#### `scroll`
Scroll to specific elements or areas:
```json
{
  "sessionId": "session_123", 
  "windowId": "window_456",
  "elementDescription": "footer section"
}
```

#### `scrape`
Extract content from web pages:
```json
{
  "sessionId": "session_123",
  "windowId": "window_456"
}
```

#### `fileInput`
Upload files to input elements:
```json
{
  "sessionId": "session_123",
  "windowId": "window_456",
  "elementDescription": "file upload button",
  "filePath": "/path/to/file.pdf"
}
```

#### `monitorForCondition`
Wait for specific page conditions:
```json
{
  "sessionId": "session_123",
  "windowId": "window_456", 
  "condition": "page finished loading",
  "timeoutSeconds": 30
}
```

## Docker Development

### Available Scripts
```bash
# Build Docker image
npm run docker:build

# Build production image with tags
npm run docker:build-prod

# Run container locally
npm run docker:run

# Test container functionality
npm run docker:test

# Push to registry (requires authentication)
npm run docker:push
```

### Multi-stage Build
The Dockerfile uses a multi-stage build approach:
1. **Builder stage**: Installs all dependencies and compiles TypeScript
2. **Production stage**: Creates minimal runtime image with only production dependencies

## API Requirements

- **Airtop API Key**: Required environment variable `AIRTOP_API_KEY`
- **Airtop SDK**: Version 0.1.44+ for full feature compatibility

## Error Handling

The server includes comprehensive error handling:
- Session lifecycle management with automatic cleanup
- Profile persistence on session termination  
- Detailed error reporting for debugging
- Graceful degradation for missing features

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

This project is licensed under the ISC License.

## Configuration

The server runs on port 3456 by default. You can change this by setting the `PORT` environment variable.

## License

ISC
