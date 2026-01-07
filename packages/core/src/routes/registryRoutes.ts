import { FastifyInstance } from 'fastify';
import { CoreService } from '../server.js';

export function registerRegistryRoutes(app: FastifyInstance, service: CoreService) {
  app.get('/api/registry/agents', async (request, reply) => {
    const agents = service.agentManager.getAgents();
    return { agents };
  });

  app.get('/api/registry/agents/:id', async (request: any, reply) => {
    const { id } = request.params;
    // Registry keys are filenames, but we want to find by ID (which might be the name or filename)
    // The current AgentManager implementation keys by filename.
    const agents = service.agentManager.getAgents();
    const agent = agents.find(a => a.name === id) || service.agentManager.registry.get(id);
    
    if (!agent) {
      return reply.code(404).send({ error: 'Agent not found' });
    }
    return { agent };
  });

  app.get('/api/registry/search', async (request: any, reply) => {
    const { capability } = request.query;
    if (!capability) {
        return reply.code(400).send({ error: 'Missing capability query param' });
    }
    // Naive implementation since we don't have explicit capabilities index yet
    // Assuming capability might match tag or description keywords
    const agents = service.agentManager.getAgents().filter(a => 
        (a.tags && a.tags.includes(capability)) || 
        (a.description && a.description.includes(capability))
    );
    return { agents };
  });
}
