import { Hono } from 'hono';
import { AuditService } from '../services/AuditService.js';
import { RbacService } from '../services/RbacService.js';
import { PolicyService } from '../services/PolicyService.js';
import { DataResidencyService } from '../services/DataResidencyService.js';
import { P2PGossipService } from '../services/P2PGossipService.js';
import { ConsensusGatingService } from '../services/ConsensusGatingService.js';
import { DeterministicReplayService } from '../services/DeterministicReplayService.js';
import { GlobalContextService } from '../services/GlobalContextService.js';
import { DigitalTwinService } from '../services/DigitalTwinService.js';
import { SyntheticEcosystemService } from '../services/SyntheticEcosystemService.js';
import { PolicyAsCodeService } from '../services/PolicyAsCodeService.js';
import { BatchProcessingService } from '../services/BatchProcessingService.js';
import { GpuAccelerationService } from '../services/GpuAccelerationService.js';
import { TieredMemoryService } from '../services/TieredMemoryService.js';

import { createRbacRoutes } from '../routes/rbacRoutesHono.js';
import { createPolicyRoutes } from '../routes/policyRoutesHono.js';
import { createCouncilNodeRoutes } from '../routes/councilNodeRoutesHono.js';
import { createDataResidencyRoutes } from '../routes/dataResidencyRoutesHono.js';
import { createBatchRoutes } from '../routes/batchRoutesHono.js';
import { createGpuRoutes } from '../routes/gpuRoutesHono.js';
import { createOpenApiRoutes } from '../routes/openapiRoutesHono.js';

export interface EnterpriseModuleOptions {
  rootDir: string;
  redisUrl?: string;
  opaUrl?: string;
  sandboxService?: any;
  vectorStore?: any;
  agentExecutor?: any;
}

export class EnterpriseModule {
  public auditService: AuditService;
  public rbacService: RbacService;
  public policyService: PolicyService;
  public dataResidencyService: DataResidencyService;
  public p2pGossipService: P2PGossipService;
  public consensusGatingService: ConsensusGatingService;
  public replayService: DeterministicReplayService;
  public globalContextService: GlobalContextService;
  public digitalTwinService: DigitalTwinService;
  public syntheticEcosystemService: SyntheticEcosystemService;
  public policyAsCodeService: PolicyAsCodeService;
  public batchProcessingService: BatchProcessingService;
  public gpuAccelerationService: GpuAccelerationService;
  public tieredMemoryService: TieredMemoryService;

  constructor(options: EnterpriseModuleOptions) {
    this.auditService = AuditService.getInstance();
    this.rbacService = RbacService.getInstance();
    this.policyService = new PolicyService(options.rootDir);
    this.dataResidencyService = DataResidencyService.getInstance(options.rootDir);

    this.p2pGossipService = P2PGossipService.getInstance('aios-node-' + options.rootDir.split('/').pop());
    this.consensusGatingService = ConsensusGatingService.getInstance();
    this.replayService = DeterministicReplayService.getInstance(options.rootDir);
    this.globalContextService = GlobalContextService.getInstance({ redisUrl: options.redisUrl });
    this.digitalTwinService = DigitalTwinService.getInstance(options.sandboxService);
    this.syntheticEcosystemService = SyntheticEcosystemService.getInstance();
    this.policyAsCodeService = PolicyAsCodeService.getInstance(options.opaUrl);
    this.batchProcessingService = BatchProcessingService.getInstance(options.agentExecutor);
    this.gpuAccelerationService = GpuAccelerationService.getInstance();
    this.tieredMemoryService = TieredMemoryService.getInstance(options.vectorStore);
  }

  registerRoutes(app: Hono, authMiddleware: any) {
    app.use('/api/rbac/*', authMiddleware.requirePermission('system:config'));
    app.route('/api/rbac', createRbacRoutes());

    app.use('/api/policies/*', authMiddleware.requirePermission('system:config'));
    app.route('/api/policies', createPolicyRoutes(this.policyService));

    app.use('/api/council-nodes/*', authMiddleware.requirePermission('system:config'));
    app.route('/api/council-nodes', createCouncilNodeRoutes());

    app.use('/api/data-residency/*', authMiddleware.requirePermission('system:config'));
    app.route('/api/data-residency', createDataResidencyRoutes());

    app.route('/api/openapi', createOpenApiRoutes());
    app.route('/api/batch', createBatchRoutes());
    app.route('/api/gpu', createGpuRoutes());
  }
}
