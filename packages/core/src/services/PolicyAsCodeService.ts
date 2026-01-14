import { EventEmitter } from 'events';
import { OPAClient } from '@styra/opa';

export interface PolicyDecision {
  allowed: boolean;
  reason?: string;
  ruleId?: string;
  severity?: string;
  agentContext?: string;
}

export class PolicyAsCodeService extends EventEmitter {
  private static instance: PolicyAsCodeService;
  private opa: OPAClient | null = null;

  private constructor(opaUrl?: string) {
    super();
    if (opaUrl) {
      this.opa = new OPAClient(opaUrl);
      console.log(`[PolicyAsCode] OPA Client connected to ${opaUrl}`);
    } else {
      console.warn('[PolicyAsCode] OPA URL not provided. Running in Passive Mode.');
    }
  }

  static getInstance(opaUrl?: string): PolicyAsCodeService {
    if (!PolicyAsCodeService.instance) {
      PolicyAsCodeService.instance = new PolicyAsCodeService(opaUrl);
    }
    return PolicyAsCodeService.instance;
  }

  async evaluateAgentAction(input: any): Promise<PolicyDecision> {
    if (!this.opa) {
      return { allowed: true, reason: 'OPA not configured' };
    }

    try {
      // Evaluate policy at path 'aios/agent/authz/allow'
      const response = await this.opa.evaluate('aios/agent/authz/allow', input);
      
      // Response format depends on the Rego policy structure
      // We assume it returns an object with 'allowed' and optional metadata
      const result = response as any;
      
      return {
        allowed: result.allowed === true,
        reason: result.reason,
        ruleId: result.rule_id,
        severity: result.severity,
        agentContext: result.agent_context
      };
    } catch (err: any) {
      console.error(`[PolicyAsCode] Evaluation failed: ${err.message}`);
      return { allowed: false, reason: `Policy Engine Error: ${err.message}`, severity: 'CRITICAL' };
    }
  }
}
