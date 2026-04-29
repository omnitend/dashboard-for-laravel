#!/usr/bin/env node

/**
 * MCP Server for Dashboard for Laravel Documentation
 *
 * Provides AI agents with structured access to documentation via MCP tools.
 * Works with Claude Desktop, Claude Code, and any MCP-compatible client.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

// Load generated documentation files
function loadApiReference() {
  const path = join(rootDir, 'docs/public/api-reference.json');
  if (!existsSync(path)) {
    throw new Error('API reference not found. Run: npm run docs:generate:ai');
  }
  return JSON.parse(readFileSync(path, 'utf8'));
}

function loadDocsMap() {
  const path = join(rootDir, 'docs/public/docs-map.md');
  if (!existsSync(path)) {
    throw new Error('Docs map not found. Run: npm run docs:generate:ai');
  }
  return readFileSync(path, 'utf8');
}

function loadLlmsTxt() {
  const path = join(rootDir, 'docs/public/llms.txt');
  if (!existsSync(path)) {
    throw new Error('llms.txt not found. Run: npm run docs:generate:ai');
  }
  return readFileSync(path, 'utf8');
}

// Read guide/documentation files
function readGuide(slug) {
  const guidePath = join(rootDir, `docs/src/pages/guide/${slug}.md`);
  if (!existsSync(guidePath)) {
    return null;
  }
  return readFileSync(guidePath, 'utf8');
}

// Create MCP server
const server = new Server(
  {
    name: 'dashboard-for-laravel-docs',
    version: '0.3.1',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'list_components',
        description: 'List all components, optionally filtered by category (base/extended) or tag',
        inputSchema: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              enum: ['base', 'extended'],
              description: 'Filter by component category',
            },
            tag: {
              type: 'string',
              description: 'Filter by tag (e.g., forms, tables, navigation)',
            },
          },
        },
      },
      {
        name: 'get_component',
        description: 'Get detailed API information for a specific component (props, events, slots)',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Component name (e.g., DButton, DXTable)',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'search_components',
        description: 'Search components by name or description',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_guide',
        description: 'Get a documentation guide (installation, forms, theming, typescript, getting-started)',
        inputSchema: {
          type: 'object',
          properties: {
            slug: {
              type: 'string',
              enum: ['installation', 'forms', 'theming', 'typescript', 'getting-started'],
              description: 'Guide slug',
            },
          },
          required: ['slug'],
        },
      },
      {
        name: 'get_overview',
        description: 'Get complete documentation overview (llms.txt content)',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_docs_map',
        description: 'Get hierarchical map of all available documentation',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'list_components': {
        const apiRef = loadApiReference();
        let components = [
          ...apiRef.components.base.map(c => ({ ...c, category: 'base' })),
          ...apiRef.components.extended.map(c => ({ ...c, category: 'extended' })),
        ];

        // Filter by category
        if (args.category) {
          components = components.filter(c => c.category === args.category);
        }

        // Filter by tag (from frontmatter)
        if (args.tag) {
          const tag = args.tag.toLowerCase();
          components = components.filter(c => {
            const mdxPath = join(rootDir, `docs/src/pages/components/${c.category}/${c.name}.mdx`);
            if (!existsSync(mdxPath)) return false;
            const content = readFileSync(mdxPath, 'utf8');
            const tagsMatch = content.match(/^tags:\s*(.+)$/m);
            if (!tagsMatch) return false;
            return tagsMatch[1].toLowerCase().includes(tag);
          });
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  total: components.length,
                  components: components.map(c => ({
                    name: c.name,
                    category: c.category,
                    description: c.description,
                    propsCount: c.props.length,
                    eventsCount: c.events.length,
                    slotsCount: c.slots.length,
                  })),
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'get_component': {
        const apiRef = loadApiReference();
        const allComponents = [
          ...apiRef.components.base,
          ...apiRef.components.extended,
        ];
        const component = allComponents.find(c => c.name === args.name);

        if (!component) {
          return {
            content: [
              {
                type: 'text',
                text: `Component "${args.name}" not found. Available components: ${allComponents.map(c => c.name).join(', ')}`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(component, null, 2),
            },
          ],
        };
      }

      case 'search_components': {
        const apiRef = loadApiReference();
        const allComponents = [
          ...apiRef.components.base,
          ...apiRef.components.extended,
        ];
        const query = args.query.toLowerCase();

        const matches = allComponents.filter(c =>
          c.name.toLowerCase().includes(query) ||
          c.description.toLowerCase().includes(query) ||
          c.filePath.toLowerCase().includes(query)
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  query: args.query,
                  matches: matches.length,
                  components: matches.map(c => ({
                    name: c.name,
                    category: c.category,
                    description: c.description,
                    filePath: c.filePath,
                  })),
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'get_guide': {
        const content = readGuide(args.slug);
        if (!content) {
          return {
            content: [
              {
                type: 'text',
                text: `Guide "${args.slug}" not found.`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: content,
            },
          ],
        };
      }

      case 'get_overview': {
        const llmsTxt = loadLlmsTxt();
        return {
          content: [
            {
              type: 'text',
              text: llmsTxt,
            },
          ],
        };
      }

      case 'get_docs_map': {
        const docsMap = loadDocsMap();
        return {
          content: [
            {
              type: 'text',
              text: docsMap,
            },
          ],
        };
      }

      default:
        return {
          content: [
            {
              type: 'text',
              text: `Unknown tool: ${name}`,
            },
          ],
          isError: true,
        };
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Dashboard for Laravel MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
