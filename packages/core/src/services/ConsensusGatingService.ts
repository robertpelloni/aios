import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import { CouncilNodeManager } from '../managers/CouncilNodeManager.js';

export type ConsensusThreshold = 'majority' | 'supermajority' | 'unanimous';

export interface ConsensusRequest {
  id: string;
  action: string;
  requesterNodeId: string;
  metadata: any;
  threshold: ConsensusThreshold;
  votes: Map<string, 'approve' | 'reject'>;
  status: 'pending' | 'approved' | 'rejected' | 'timeout';
  expiresAt: number;
}

export class ConsensusGatingService extends EventEmitter {
  private static instance: ConsensusGatingService;
  private requests: Map<string, ConsensusRequest> = new Map();
  private nodeManager: CouncilNodeManager;

  private constructor() {
    super();
    this.nodeManager = CouncilNodeManager.getInstance();
  }

  static getInstance(): ConsensusGatingService {
    if (!ConsensusGatingService.instance) {
      ConsensusGatingService.instance = new ConsensusGatingService();
    }
    return ConsensusGatingService.instance;
  }

  async requestConsensus(action: string, metadata: any, threshold: ConsensusThreshold = 'majority', timeoutMs: number = 60000): Promise<boolean> {
    const id = randomUUID();
    const request: ConsensusRequest = {
      id,
      action,
      requesterNodeId: 'local', // In real distributed setup, this would be the local node ID
      metadata,
      threshold,
      votes: new Map(),
      status: 'pending',
      expiresAt: Date.now() + timeoutMs
    };

    // Auto-approve from local
    request.votes.set('local', 'approve');
    this.requests.set(id, request);

    console.log(`[Consensus] Requesting consensus for action: ${action} (${id})`);

    // Broadcast to remote nodes
    const nodes = this.nodeManager.getAllNodes();
    for (const node of nodes) {
      if (node.status === 'online') {
        this.sendRequestToNode(node.id, request);
      }
    }

    // Wait for consensus
    return this.waitForConsensus(id, timeoutMs);
  }

  private async sendRequestToNode(nodeId: string, request: ConsensusRequest) {
    // In a real implementation, this would be a POST to the remote node's /api/consensus/vote endpoint
    // Or a Socket.io event if we have persistent connections to peer nodes.
    console.log(`[Consensus] Broadcasting request ${request.id} to node ${nodeId}`);
  }

  async submitVote(requestId: string, nodeId: string, vote: 'approve' | 'reject') {
    const request = this.requests.get(requestId);
    if (!request || request.status !== 'pending') return;

    request.votes.set(nodeId, vote);
    this.checkConsensus(requestId);
    this.emit('voteSubmitted', { requestId, nodeId, vote });
  }

  private checkConsensus(requestId: string) {
    const request = this.requests.get(requestId);
    if (!request) return;

    const totalNodes = this.nodeManager.getAllNodes().length + 1; // +1 for local
    const approvals = Array.from(request.votes.values()).filter(v => v === 'approve').length;
    const rejections = Array.from(request.votes.values()).filter(v => v === 'reject').length;

    let approved = false;
    const required = request.threshold === 'unanimous' ? totalNodes :
                     request.threshold === 'supermajority' ? Math.ceil(totalNodes * 0.66) :
                     Math.floor(totalNodes / 2) + 1;

    if (approvals >= required) {
      request.status = 'approved';
      approved = true;
    } else if (rejections > (totalNodes - required)) {
      request.status = 'rejected';
    }

    if (request.status !== 'pending') {
      this.emit('consensusReached', request);
    }
  }

  private async waitForConsensus(requestId: string, timeout: number): Promise<boolean> {
    return new Promise((resolve) => {
      const check = () => {
        const req = this.requests.get(requestId);
        if (!req) return resolve(false);
        if (req.status === 'approved') return resolve(true);
        if (req.status === 'rejected' || req.status === 'timeout') return resolve(false);
        if (Date.now() > req.expiresAt) {
          req.status = 'timeout';
          return resolve(false);
        }
        setTimeout(check, 500);
      };
      check();
    });
  }

  getRequests() {
    return Array.from(this.requests.values());
  }
}
