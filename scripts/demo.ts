import { SwarmOrchestrator } from '../server/src/agents/orchestrator.js';
import { globalFacilitator } from '../server/src/protocol/x402Facilitator.js';
import express from 'express';
import cors from 'cors';
import { requireX402Payment, X402Request } from '../server/src/protocol/x402Middleware.js';
import { runSecurityAudit, runGasOptimizer, runZkProver } from '../server/src/agents/specialistLogics.js';

async function main() {
  console.log(`\n===============================================================`);
  console.log(`⚡ NEXUS402: AUTONOMOUS AGENT MULTI-TASK DEMO (x402 RFC)`);
  console.log(`===============================================================`);

  const app = express();
  app.use(cors());
  app.use(express.json());

  // Setup mock server on port 4029
  app.post(
    '/api/v1/agent/security-audit',
    requireX402Payment({
      serviceId: 'agent-security',
      description: 'Autonomous Smart Contract Security Audit',
      recipient: '0x111111111111111111111111111111111111402A',
      amountMicroUnits: '25000'
    }),
    (req: X402Request, res) => res.json({ success: true, data: runSecurityAudit(req.body), receipt: req.x402Receipt })
  );

  app.post(
    '/api/v1/agent/gas-profile',
    requireX402Payment({
      serviceId: 'agent-gas-optimizer',
      description: 'EVM Gas Profiling',
      recipient: '0x222222222222222222222222222222222222402B',
      amountMicroUnits: '15000'
    }),
    (req: X402Request, res) => res.json({ success: true, data: runGasOptimizer(req.body), receipt: req.x402Receipt })
  );

  app.post(
    '/api/v1/agent/zk-proof',
    requireX402Payment({
      serviceId: 'agent-zk-prover',
      description: 'ZK Solvency Proof',
      recipient: '0x333333333333333333333333333333333333402C',
      amountMicroUnits: '40000'
    }),
    (req: X402Request, res) => res.json({ success: true, data: runZkProver(req.body), receipt: req.x402Receipt })
  );

  const server = app.listen(4029);

  const orchestrator = new SwarmOrchestrator('http://localhost:4029');
  const clientAddr = orchestrator.getClientAddress();
  console.log(`🤖 Master Orchestrator Agent Wallet: ${clientAddr}`);
  console.log(`💰 Initial Agent Balance: ${(Number(globalFacilitator.getBalance(clientAddr))/1e6).toFixed(4)} USDC\n`);

  console.log(`🚀 Dispatching Swarm Mission: "Audit Uniswap V4 Hook & Issue ZK Solvency Certificate"...`);

  const result = await orchestrator.executeMission({
    missionId: 'demo_mission_001',
    title: 'Audit Uniswap V4 Hook & Issue ZK Solvency Certificate',
    targetContractAddress: '0x71C8402A...HookVault',
    budgetLimitUSDC: 1.0,
    payload: {
      sourceSnippet: `
        contract HookVault {
          mapping(address => uint256) public balances;
          function withdraw(uint256 amount) external {
            (bool s, ) = msg.sender.call{value: amount}("");
            require(s);
            balances[msg.sender] -= amount;
          }
        }
      `
    }
  }, (progress) => {
    const current = progress.subtasks.find(t => t.status === 'CHALLENGED_402' || t.status === 'SIGNING');
    if (current) {
      console.log(`  ⏳ [${current.agentName}] Negotiating x402 Challenge -> Signing EIP-712 payment authorization...`);
    }
  });

  console.log(`\n✅ Swarm Mission Successfully Completed!`);
  console.log(`📊 Total Incurred Cost: ${result.totalSpentUSDC} USDC`);
  console.log(`💰 Remaining Agent Balance: ${(Number(globalFacilitator.getBalance(clientAddr))/1e6).toFixed(4)} USDC\n`);

  console.log(`--- Cryptographic Receipt Trail ---`);
  result.subtasks.forEach(t => {
    console.log(`  🔹 ${t.agentName}:`);
    console.log(`     - Cost: ${t.cost}`);
    console.log(`     - Receipt ID: ${t.receipt?.receiptId}`);
    console.log(`     - Auth Hash: ${t.receipt?.authHash}`);
    console.log(`     - Status: ${t.receipt?.status}`);
  });

  console.log(`\n--- Executive Synthesis ---`);
  console.log(`  🛡️ Security Score: ${result.synthesizedReport.securityScore}/100`);
  console.log(`  ⛽ Gas Optimization: ${result.synthesizedReport.gasSavingsSummary}`);
  console.log(`  🔐 ZK Solvency Digest: ${result.synthesizedReport.zkProofVerificationHash}\n`);

  server.close();
}

main().catch(err => {
  console.error('Demo error:', err);
  process.exit(1);
});
