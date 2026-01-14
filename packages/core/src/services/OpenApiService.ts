/**
 * AIOS OpenAPI Service
 * 
 * Generates and manages the OpenAPI 3.0 specification for the AIOS API.
 * This serves as the foundation for multi-language SDKs.
 */

export interface OpenApiSpec {
  openapi: string;
  info: {
    title: string;
    description: string;
    version: string;
    contact?: {
      name: string;
      url: string;
    };
  };
  servers: Array<{ url: string; description?: string }>;
  paths: Record<string, any>;
  components: {
    schemas: Record<string, any>;
    securitySchemes: Record<string, any>;
  };
}

export class OpenApiService {
  private spec: OpenApiSpec;

  constructor(version: string = '0.3.0') {
    this.spec = {
      openapi: '3.0.0',
      info: {
        title: 'AIOS API',
        description: 'The Unified AI Operating System API for Autonomous Agents, Councils, and Enterprise Orchestration.',
        version,
        contact: {
          name: 'OhMyOpenCode Team',
          url: 'https://github.com/code-yeongyu/aios'
        }
      },
      servers: [
        { url: 'http://localhost:3000', description: 'Local Development Server' }
      ],
      paths: {},
      components: {
        schemas: {},
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer'
          }
        }
      }
    };

    this.initializeBaseDefinitions();
  }

  private initializeBaseDefinitions() {
    // Add common schemas
    this.spec.components.schemas = {
      Agent: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          model: { type: 'string' },
          instructions: { type: 'string' }
        }
      },
      Workflow: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          status: { type: 'string', enum: ['draft', 'active', 'paused', 'archived'] },
          steps: { type: 'array', items: { $ref: '#/components/schemas/WorkflowStep' } }
        }
      },
      WorkflowStep: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          type: { type: 'string' }
        }
      }
    };

    // Agents API
    this.spec.paths['/api/agents/run'] = {
      post: {
        summary: 'Run an autonomous agent',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  agentName: { type: 'string' },
                  task: { type: 'string' },
                  sessionId: { type: 'string' }
                },
                required: ['agentName', 'task']
              }
            }
          }
        },
        responses: {
          200: { description: 'Successful execution', content: { 'application/json': { schema: { type: 'object' } } } }
        }
      }
    };

    // RBAC API
    this.spec.paths['/api/rbac/roles'] = {
      get: {
        summary: 'List system roles',
        responses: {
          200: { description: 'List of roles' }
        }
      }
    };

    // Add more paths as needed
  }

  getSpec(): OpenApiSpec {
    return this.spec;
  }
}

let instance: OpenApiService | null = null;
export function getOpenApiService(): OpenApiService {
  if (!instance) {
    instance = new OpenApiService();
  }
  return instance;
}
