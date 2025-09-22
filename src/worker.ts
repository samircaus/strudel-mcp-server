import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';

import { MusicTheory } from './services/MusicTheory.js';
import { PatternGenerator } from './services/PatternGenerator.js';

export interface Env {
  ENVIRONMENT?: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // MCP Server endpoint
    if (url.pathname === '/sse') {
      return handleMCPRequest(request, env);
    }

    return new Response('Not Found', { status: 404 });
  },
};

async function handleMCPRequest(request: Request, env: Env): Promise<Response> {
  const mcpServer = new MCPWorkerServer(env);
  
  if (request.method === 'POST') {
    try {
      const body = await request.json();
      const response = await mcpServer.handleRequest(body);
      
      return new Response(JSON.stringify(response), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    } catch (error) {
      return new Response(JSON.stringify({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal error',
          data: error instanceof Error ? error.message : 'Unknown error'
        }
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
  }
  
  return new Response('Method not allowed', { status: 405 });
}

class MCPWorkerServer {
  private server: Server;
  private theory: MusicTheory;
  private generator: PatternGenerator;

  constructor(private env: Env) {
    this.server = new Server(
      {
        name: 'strudel-mcp-cloudflare',
        version: '2.2.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.theory = new MusicTheory();
    this.generator = new PatternGenerator();
    this.setupHandlers();
  }

  getServer(): Server {
    return this.server;
  }

  async handleRequest(body: any): Promise<any> {
    const { jsonrpc, id, method, params } = body;
    
    if (jsonrpc !== '2.0') {
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32600,
          message: 'Invalid Request'
        }
      };
    }

    try {
      if (method === 'tools/list') {
        return {
          jsonrpc: '2.0',
          id,
          result: {
            tools: this.getTools()
          }
        };
      } else if (method === 'tools/call') {
        const { name, arguments: args } = params;
        const result = await this.executeTool(name, args);
        
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ 
              type: 'text', 
              text: typeof result === 'string' ? result : JSON.stringify(result, null, 2) 
            }]
          }
        };
      } else {
        return {
          jsonrpc: '2.0',
          id,
          error: {
            code: -32601,
            message: 'Method not found'
          }
        };
      }
    } catch (error: any) {
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32603,
          message: 'Internal error',
          data: error.message
        }
      };
    }
  }

  private getTools(): Tool[] {
    return [
      {
        name: 'generate_pattern',
        description: 'Generate complete pattern from style',
        inputSchema: {
          type: 'object',
          properties: {
            style: { type: 'string', description: 'Music style (techno/house/dnb/ambient/etc)' },
            key: { type: 'string', description: 'Musical key' },
            bpm: { type: 'number', description: 'Tempo in BPM' }
          },
          required: ['style']
        }
      },
      {
        name: 'generate_drums',
        description: 'Generate drum pattern',
        inputSchema: {
          type: 'object',
          properties: {
            style: { type: 'string', description: 'Drum style' },
            complexity: { type: 'number', description: 'Complexity (0-1)' }
          },
          required: ['style']
        }
      },
      {
        name: 'generate_bassline',
        description: 'Generate bassline',
        inputSchema: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Musical key' },
            style: { type: 'string', description: 'Bass style' }
          },
          required: ['key', 'style']
        }
      },
      {
        name: 'generate_melody',
        description: 'Generate melody from scale',
        inputSchema: {
          type: 'object',
          properties: {
            scale: { type: 'string', description: 'Scale name' },
            root: { type: 'string', description: 'Root note' },
            length: { type: 'number', description: 'Number of notes' }
          },
          required: ['scale', 'root']
        }
      },
      {
        name: 'generate_scale',
        description: 'Generate scale notes',
        inputSchema: {
          type: 'object',
          properties: {
            root: { type: 'string', description: 'Root note' },
            scale: { type: 'string', description: 'Scale type' }
          },
          required: ['root', 'scale']
        }
      },

    ];
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: this.getTools()
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      try {
        const result = await this.executeTool(name, args);
        
        return {
          content: [{ 
            type: 'text', 
            text: typeof result === 'string' ? result : JSON.stringify(result, null, 2) 
          }],
        };
      } catch (error: any) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error: ${error.message}` 
          }],
        };
      }
    });
  }

  private async executeTool(name: string, args: any): Promise<any> {
    switch (name) {
      case 'generate_pattern':
        const pattern = this.generator.generateCompletePattern(
          args.style,
          args.key || 'C',
          args.bpm || 120
        );
        return {
          pattern,
          style: args.style,
          key: args.key || 'C',
          bpm: args.bpm || 120
        };

      case 'generate_drums':
        const drums = this.generator.generateDrumPattern(args.style, args.complexity || 0.5);
        return {
          pattern: drums,
          style: args.style,
          complexity: args.complexity || 0.5
        };

      case 'generate_bassline':
        const bass = this.generator.generateBassline(args.key, args.style);
        return {
          pattern: bass,
          key: args.key,
          style: args.style
        };

      case 'generate_melody':
        const scale = this.theory.generateScale(args.root, args.scale);
        const melody = this.generator.generateMelody(scale, args.length || 8);
        return {
          pattern: melody,
          scale: `${args.root} ${args.scale}`,
          notes: scale
        };

      case 'generate_scale':
        const scaleNotes = this.theory.generateScale(args.root, args.scale);
        return {
          scale: `${args.root} ${args.scale}`,
          notes: scaleNotes
        };



      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }
}