#!/usr/bin/env bash
set -euo pipefail

# Read token from .env
ENV_FILE=".env"
if [ ! -f "$ENV_FILE" ]; then
  echo "Error: .env file not found."
  exit 1
fi

NOTION_TOKEN=$(grep -E "^NOTION_API_TOKEN=" "$ENV_FILE" | cut -d'=' -f2- | tr -d '"' | tr -d "'")

if [ -z "$NOTION_TOKEN" ]; then
  echo "Error: NOTION_API_TOKEN is not set in .env."
  exit 1
fi

# Print MCP configuration block
print_config() {
  echo "========================================="
  echo "Notion MCP Server Configuration (stdio)"
  echo "========================================="
  echo "Add the following snippet to your client's configuration file:"
  echo ""
  cat <<EOF
{
  "mcpServers": {
    "notion": {
      "command": "npx",
      "args": ["-y", "@notionhq/notion-mcp-server"],
      "env": {
        "NOTION_TOKEN": "$NOTION_TOKEN"
      }
    }
  }
}
EOF
  echo ""
  echo "========================================="
}

# Run the server
run_server() {
  echo "Starting local Notion MCP server on http://127.0.0.1:3000..."
  export NOTION_TOKEN="$NOTION_TOKEN"
  npx -y @notionhq/notion-mcp-server --transport http --port 3000
}

# Parse options
if [[ "${1:-}" == "--run" ]]; then
  run_server
else
  print_config
  echo "To start the local server over HTTP/SSE, run: $0 --run"
fi
