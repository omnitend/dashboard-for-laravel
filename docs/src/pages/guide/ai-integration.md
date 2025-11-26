---
layout: ../../layouts/DashboardLayout.astro
title: AI Integration
---

# AI Integration

This library includes an MCP (Model Context Protocol) server that provides AI agents with structured access to documentation.

## What is MCP?

MCP is a protocol that allows AI assistants like Claude Desktop and Claude Code to query external data sources via standardised tool calls. The MCP server exposes the documentation as queryable tools, so AI can look up component APIs, search for examples, and retrieve guides.

## Setup

### Claude Code

If you're working in a project that uses this library, add this to your `.mcp.json`:

```json
{
  "mcpServers": {
    "dashboard-for-laravel-docs": {
      "command": "npx",
      "args": [
        "-y",
        "@omnitend/dashboard-for-laravel@latest",
        "dashboard-docs-mcp"
      ]
    }
  }
}
```

Claude Code will prompt you to enable it when you open the project.

### Claude Desktop

Add to your Claude Desktop config file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "dashboard-for-laravel-docs": {
      "command": "npx",
      "args": [
        "-y",
        "@omnitend/dashboard-for-laravel",
        "dashboard-docs-mcp"
      ]
    }
  }
}
```

## Available Tools

### `list_components`

List all components, optionally filtered by category or tag.

**Parameters:**
- `category` (optional): `"base"` or `"extended"`
- `tag` (optional): e.g., `"forms"`, `"tables"`, `"navigation"`

### `get_component`

Get detailed API information for a specific component.

**Parameters:**
- `name` (required): Component name, e.g., `"DXTable"`, `"DButton"`

**Returns:** Props, events, slots, and descriptions.

### `search_components`

Search components by name or description.

**Parameters:**
- `query` (required): Search query

### `get_guide`

Retrieve a documentation guide.

**Parameters:**
- `slug` (required): One of `"installation"`, `"forms"`, `"theming"`, `"typescript"`, `"getting-started"`

### `get_overview`

Get the complete documentation overview (llms.txt content).

### `get_docs_map`

Get hierarchical map of all available documentation.

## Usage Examples

Once configured, you can ask AI assistants questions like:

- "Show me all form-related components" (uses `list_components`)
- "What are the props for DXTable?" (uses `get_component`)
- "How do I install this library?" (uses `get_guide`)
- "Search for table components" (uses `search_components`)

## llms.txt

This library also publishes an [llms.txt](https://llmstxt.org/) file at `/llms.txt` for AI discovery. This follows the emerging standard for AI-readable documentation.

## More Information

See the [MCP_SERVER.md](https://github.com/omnitend/dashboard-for-laravel/blob/main/MCP_SERVER.md) file in the repository for complete setup options and technical details.
