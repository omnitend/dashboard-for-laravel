# MCP Server - Dashboard for Laravel Documentation

An MCP (Model Context Protocol) server that provides AI agents with structured access to the Dashboard for Laravel documentation.

## What is MCP?

MCP is a protocol that allows AI assistants (Claude Desktop, Claude Code, etc.) to query external data sources via standardized tool calls. This MCP server exposes the documentation as queryable tools.

## Available Tools

### 1. `list_components`

List all components, optionally filtered by category or tag.

**Parameters:**
- `category` (optional): Filter by "base" or "extended"
- `tag` (optional): Filter by tag (e.g., "forms", "tables", "navigation")

**Example:**
```json
{
  "category": "extended",
  "tag": "forms"
}
```

**Returns:** List of components with name, category, description, and API summary.

### 2. `get_component`

Get detailed API information for a specific component.

**Parameters:**
- `name` (required): Component name (e.g., "DButton", "DXTable")

**Example:**
```json
{
  "name": "DXTable"
}
```

**Returns:** Complete component API including props, events, slots, methods, and descriptions.

### 3. `search_components`

Search components by name or description.

**Parameters:**
- `query` (required): Search query string

**Example:**
```json
{
  "query": "form"
}
```

**Returns:** List of matching components with relevance information.

### 4. `get_guide`

Retrieve a specific documentation guide.

**Parameters:**
- `slug` (required): One of: "installation", "forms", "theming", "typescript", "getting-started"

**Example:**
```json
{
  "slug": "forms"
}
```

**Returns:** Full markdown content of the guide.

### 5. `get_overview`

Get the complete documentation overview (llms.txt content).

**Parameters:** None

**Returns:** The llms.txt file content with links to all documentation.

### 6. `get_docs_map`

Get hierarchical map of all available documentation.

**Parameters:** None

**Returns:** Complete documentation structure in markdown format.

## Setup

### Prerequisites

1. **Generate documentation files:**
   ```bash
   npm run docs:generate:ai
   ```

2. **MCP SDK is installed** (already in devDependencies)

### Claude Desktop Configuration

Add to your Claude Desktop config file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "dashboard-for-laravel-docs": {
      "command": "node",
      "args": [
        "/Users/jamespickard/Code/omni-tend/dashboard-for-laravel/scripts/mcp-server.mjs"
      ]
    }
  }
}
```

### Claude Code Configuration

The MCP server is automatically configured via `.mcp.json` in the project root.

When you open this project in Claude Code, it will prompt you to enable the MCP server. Simply accept the prompt.

Alternatively, you can manually enable it by adding to `.claude/settings.local.json`:

```json
{
  "enabledMcpjsonServers": ["dashboard-for-laravel-docs"]
}
```

## Usage Examples

Once configured, AI agents can query your documentation:

**"Show me all form-related components"**
→ Uses `list_components` with tag="forms"

**"What are the props for DXTable?"**
→ Uses `get_component` with name="DXTable"

**"How do I install this library?"**
→ Uses `get_guide` with slug="installation"

**"Search for table components"**
→ Uses `search_components` with query="table"

## How It Works

1. **Pre-generated data** - MCP server reads from auto-generated files:
   - `docs/public/api-reference.json` - Component API data
   - `docs/public/llms.txt` - Documentation overview
   - `docs/public/docs-map.md` - Documentation structure
   - `docs/src/pages/guide/*.md` - Guide content

2. **Tool handlers** - Each tool reads the relevant data and returns structured responses

3. **Zero runtime overhead** - All data is pre-generated, server just reads and filters

## Development

### Testing the Server

You can test the MCP server locally by running it directly:

```bash
node scripts/mcp-server.mjs
```

Then send MCP protocol messages via stdin (JSON-RPC format).

### Updating

The MCP server automatically uses the latest generated documentation files. To update:

```bash
npm run docs:generate:ai  # Regenerate doc files
# MCP server now serves updated data
```

## Benefits

✅ **Always up-to-date** - Uses auto-generated files that rebuild with docs
✅ **Efficient** - AI agents query exactly what they need
✅ **Structured** - Type-safe tool calls with validated schemas
✅ **Fast** - Pre-generated data means instant responses
✅ **Reusable** - Works with any MCP-compatible AI assistant

## Package Integration

This MCP server can also be published as a standalone NPM package for users to install:

```bash
npm install -g @omnitend/dashboard-for-laravel-mcp
```

Then users can add it to their Claude config without cloning the repo.
