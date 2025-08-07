# Simple containerization of pre-built airtop-mcp server
FROM node:lts-alpine

# Create app directory
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S airtop -u 1001 -G nodejs

# Copy only the built application and runtime files
COPY package.json ./
COPY node_modules/ ./node_modules/
COPY dist/ ./dist/
COPY bin/ ./bin/

# Make bin script executable and change ownership to non-root user
RUN chmod +x bin/airtop-mcp && chown -R airtop:nodejs /app

# Switch to non-root user
USER airtop

# Set environment variables
ENV NODE_ENV=production

# Default command runs the MCP server using node with -- to pass args
CMD ["node", "./bin/airtop-mcp"]
