# Notion MCP Server Integration Guide

This guide describes how to connect Model Context Protocol (MCP) clients (such as your IDE, Cursor, Claude Desktop, or Claude Code) to your Notion workspace. Exposing your Notion workspace via MCP allows AI assistants to securely read, search, and inspect the structure of your personal finance databases.

---

## Connection Options

### Option 1: Remote Notion MCP (Recommended for IDEs)

Notion provides a hosted, remote MCP server that supports **OAuth authentication**. This is the easiest and most secure option for interactive client applications (like Cursor or VS Code extensions).

- **SSE Endpoint:** `https://mcp.notion.com/sse`
- **Documentation:** [Connecting to Notion MCP](https://developers.notion.com/docs/mcp)

When you configure this URL in your client, it will prompt you to complete a standard Notion OAuth flow to authorize connection to your pages and databases.

---

### Option 2: Local Notion MCP (Recommended for Local Scripts & CLI Tools)

For fully automated, headless, or token-based workflows, you can run the official local Notion MCP server (`@notionhq/notion-mcp-server`) using the internal integration token configured in your `.env` file.

#### 1. Setup Stdio Server (Subprocess Mode)
If your AI assistant launches MCP servers as subprocesses (such as Claude Desktop or Cursor), add the following configuration block to your client's config file (e.g. `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "notion": {
      "command": "npx",
      "args": ["-y", "@notionhq/notion-mcp-server"],
      "env": {
        "NOTION_TOKEN": "your-internal-integration-secret-here"
      }
    }
  }
}
```
> [!TIP]
> You can retrieve this JSON snippet automatically populated with your `.env` token by running the helper script:
> ```shell
> ./setup-mcp.sh
> ```

#### 2. Setup HTTP/SSE Server
To run the server in the background as a local service over HTTP/SSE:
```shell
./setup-mcp.sh --run
# Or using npm
npm run mcp
```
This launches the server on `http://127.0.0.1:3000`. You can then connect your MCP client to the local server using:
- **Transport Type:** `sse`
- **URL:** `http://127.0.0.1:3000/sse`

---

## Security Best Practices
- **Token Handling:** Treat your `NOTION_TOKEN` as a secret. Never commit it to git or share it.
- **Access Control:** Go to [notion.so/profile/integrations](https://www.notion.so/profile/integrations) and ensure the integration's capabilities are restricted only to the permissions needed (e.g., Read content, Update content). Do not grant "Delete content" unless necessary.
- **Connection Scope:** Explicitly connect the integration only to the specific databases (e.g. Transactions, Mappings, Budget Categories) that require automation.
