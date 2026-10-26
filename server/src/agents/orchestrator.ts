import { AutonomousX402Client } from '../protocol/x402Client.js';
import { SPECIALIST_AGENTS } from './agentCatalog.js';
import { SwarmMissionRequest, SwarmSubtask } from '../protocol/x402Types.js';

export interface SwarmMissionProgress {
  missionId: string;
  status: 'INITIALIZING' | 'EXECUTING' | 'COMPLETED' | 'FAILED';
  totalTasks: number;
  completedTasks: number;
  totalSpentUSDC: number;
  subtasks: SwarmSubtask[];
  synthesizedReport?: any;
  error?: string;
}

export class SwarmOrchestrator {
  private client: AutonomousX402Client;
  private serverBaseUrl: string;

  constructor(serverBaseUrl = 'http://localhost:4020') {
    this.serverBaseUrl = serverBaseUrl;
    // Master client agent wallet
    this.client = new AutonomousX402Client(
      undefined,
      'Nexus-Master-Orchestrator-Agent-0xPrime'
    );
  }

  public getClientAddress(): string {
    return this.client.getAddress();
  }

  /**
   * Executes a multi-agent mission using x402 pay-per-call microtransactions
   */
  public async executeMission(
    request: SwarmMissionRequest,
    onProgressUpdate?: (progress: SwarmMissionProgress) => void
  ): Promise<SwarmMissionProgress> {
    const subtasks: SwarmSubtask[] = [
      {
        taskId: `task_sec_${Date.now()}`,
        agentId: 'agent-security',
        agentName: 'Valkyrie Security Sentinel',
        endpoint: `${this.serverBaseUrl}/api/v1/agent/security-audit`,
        status: 'PENDING',
        cost: '0.0250 USDC',
        requestPayload: {
          contractName: 'VaultCoreV4.sol',
          sourceSnippet: request.payload?.sourceSnippet || `
            contract VaultCoreV4 {
              mapping(address => uint256) public balances;
              function withdraw(uint256 amount) external {
                require(balances[msg.sender] >= amount);
                (bool s, ) = msg.sender.call{value: amount}("");
                require(s);
                balances[msg.sender] -= amount;
              }
            }
          `,
          targetAddress: request.targetContractAddress || '0x71C8402A...Vault'
        }
      },
      {
        taskId: `task_gas_${Date.now() + 1}`,
        agentId: 'agent-gas-optimizer',
        agentName: 'Helios EVM Gas Optimizer',
        endpoint: `${this.serverBaseUrl}/api/v1/agent/gas-profile`,
        status: 'PENDING',
        cost: '0.0150 USDC',
        requestPayload: {
          contractName: 'VaultCoreV4.sol',
          sourceSnippet: request.payload?.sourceSnippet || 'contract VaultCoreV4 { uint256 a; address b; }'
        }
      },
      {
        taskId: `task_zk_${Date.now() + 2}`,
        agentId: 'agent-zk-prover',
        agentName: 'ZeroMesh ZK-SNARK Prover',
        endpoint: `${this.serverBaseUrl}/api/v1/agent/zk-proof`,
        status: 'PENDING',
        cost: '0.0400 USDC',
        requestPayload: {
          statement: `SolvencyVerification_${request.targetContractAddress || 'VaultCoreV4'}_${Date.now()}`
        }
      }
    ];

    let totalSpentMicroUnits = 0n;

    const progress: SwarmMissionProgress = {
      missionId: request.missionId,
      status: 'EXECUTING',
      totalTasks: subtasks.length,
      completedTasks: 0,
      totalSpentUSDC: 0,
      subtasks
    };

    onProgressUpdate?.({ ...progress });

    // Execute subtasks sequentially with full x402 challenge negotiation
    for (const task of subtasks) {
      task.status = 'CHALLENGED_402';
      onProgressUpdate?.({ ...progress });

      const startTime = Date.now();
      const callResult = await this.client.callEndpoint(task.endpoint, {
        method: 'POST',
        body: task.requestPayload,
        maxBudgetUSDC: request.budgetLimitUSDC || 1.0
      });

      task.latencyMs = Date.now() - startTime;

      if (!callResult.success) {
        task.status = 'FAILED';
        task.error = callResult.error;
        progress.status = 'FAILED';
        progress.error = `Subtask ${task.agentName} failed: ${callResult.error}`;
        onProgressUpdate?.({ ...progress });
        return progress;
      }

      task.status = 'SETTLED';
      task.responsePayload = callResult.data;
      task.receipt = callResult.receipt;

      // Extract telemetry details for inspector
      const challengeStep = callResult.telemetry.find(t => t.step === 'CHALLENGE_RECEIVED');
      if (challengeStep?.challenge) {
        task.paymentRequirements = challengeStep.challenge;
      }
      const signStep = callResult.telemetry.find(t => t.step === 'SIGNING_PAYMENT');
      if (signStep?.signedAuthorization) {
        task.paymentAuthorization = signStep.signedAuthorization;
      }

      if (callResult.receipt) {
        totalSpentMicroUnits += BigInt(callResult.receipt.amount);
      }

      task.status = 'COMPLETED';
      progress.completedTasks++;
      progress.totalSpentUSDC = Number(totalSpentMicroUnits) / 1_000_000;
      onProgressUpdate?.({ ...progress });
    }

    const secData = subtasks[0].responsePayload?.data || subtasks[0].responsePayload;
    const gasData = subtasks[1].responsePayload?.data || subtasks[1].responsePayload;
    const zkData = subtasks[2].responsePayload?.data || subtasks[2].responsePayload;

    // Synthesize final Executive Intelligence Report
    progress.status = 'COMPLETED';
    progress.synthesizedReport = {
      executiveSummary: 'All specialist agents successfully completed analysis and settled micro-invoices autonomously via x402 HTTP 402 protocol.',
      missionId: request.missionId,
      target: request.targetContractAddress || 'VaultCoreV4.sol',
      totalIncurredCostUSDC: progress.totalSpentUSDC,
      securityScore: secData?.overallSecurityScore,
      gasSavingsSummary: (gasData?.totalEstimatedGasSavings || '31,900') + ' gas saved per invocation',
      zkProofVerificationHash: zkData?.verificationDigest || zkData?.proofId,
      cryptographicSettlements: subtasks.map(t => ({
        agent: t.agentName,
        receiptId: t.receipt?.receiptId,
        authHash: t.receipt?.authHash,
        cost: t.cost,
        status: t.receipt?.status
      }))
    };

    onProgressUpdate?.({ ...progress });
    return progress;
  }
}
