import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { globalFacilitator } from './protocol/x402Facilitator.js';
import { requireX402Payment, X402Request } from './protocol/x402Middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { SPECIALIST_AGENTS } from './agents/agentCatalog.js';
import {
  runSecurityAudit,
  runGasOptimizer,
  runZkProver
} from './agents/specialistLogics.js';
import { SwarmOrchestrator, SwarmMissionProgress } from './agents/orchestrator.js';
import { SwarmMissionRequest } from './protocol/x402Types.js';

const app = express();
const PORT = process.env.PORT || 4020;

app.use(cors({
  origin: '*',
  exposedHeaders: ['PAYMENT-REQUIRED', 'PAYMENT-RESPONSE', 'X-AGENT-IDENTITY', 'X-SLA-GUARANTEE']
}));
app.use(express.json());

// State for active mission
let latestMissionProgress: SwarmMissionProgress | null = null;
const orchestrator = new SwarmOrchestrator(`http://localhost:${PORT}`);

// --- Public Endpoints ---

app.get('/api/v1/health', (req: Request, res: Response) => {
  res.json({
    status: 'ONLINE',
    service: 'Nexus402 Agentic Payment Mesh',
    protocol: 'x402 (RFC-402 / EIP-712)',
    timestamp: new Date().toISOString(),
    settlementContract: globalFacilitator.settlementContractAddress,
    chainId: globalFacilitator.chainId,
    activeAgentsCount: SPECIALIST_AGENTS.length
  });
});

app.get('/api/v1/agents', (req: Request, res: Response) => {
  res.json({
    agents: SPECIALIST_AGENTS,
    facilitator: {
      address: globalFacilitator.facilitatorAddress,
      settlementContract: globalFacilitator.settlementContractAddress,
      domain: globalFacilitator.getDomain()
    }
  });
});

app.get('/api/v1/protocol/spec', (req: Request, res: Response) => {
  res.json({
    protocol: 'x402',
    name: 'Nexus402 Specification',
    description: 'HTTP 402 Payment Required Standard for Machine-to-Machine & Autonomous Agent Commerce',
    version: '1.0.0',
    headers: {
      challengeHeader: 'PAYMENT-REQUIRED',
      authorizationHeader: 'PAYMENT-SIGNATURE',
      receiptHeader: 'PAYMENT-RESPONSE'
    },
    eip712: {
      domain: globalFacilitator.getDomain(),
      types: globalFacilitator.getTypes()
    }
  });
});

// --- Wallet & Faucet Endpoints ---

app.get('/api/v1/wallet/:address', (req: Request, res: Response) => {
  const address = String(req.params.address);
  const balanceMicroUnits = globalFacilitator.getBalance(address);
  res.json({
    address,
    balanceMicroUnits: balanceMicroUnits.toString(),
    formattedBalanceUSDC: `${(Number(balanceMicroUnits) / 1_000_000).toFixed(4)} USDC`,
    balanceUSDC: Number(balanceMicroUnits) / 1_000_000
  });
});

app.post('/api/v1/faucet', (req: Request, res: Response) => {
  const { address, amountUSDC } = req.body;
  if (!address) {
    return res.status(400).json({ error: 'Missing address' });
  }
  const amountToFund = BigInt(Math.floor((amountUSDC || 25) * 1_000_000));
  const newBal = globalFacilitator.fundAgent(address, amountToFund);
  res.json({
    success: true,
    address,
    fundedAmountUSDC: amountUSDC || 25,
    newBalanceUSDC: Number(newBal) / 1_000_000
  });
});

app.get('/api/v1/receipts', (req: Request, res: Response) => {
  res.json({
    receipts: globalFacilitator.getAllReceipts()
  });
});

// --- x402 Protected Agent Endpoints ---

// Agent 1: Valkyrie Security Sentinel
app.post(
  '/api/v1/agent/security-audit',
  requireX402Payment({
    serviceId: 'agent-security',
    description: 'Autonomous Smart Contract Security Audit & Threat Scan',
    recipient: '0x111111111111111111111111111111111111402A',
    amountMicroUnits: '25000', // 0.025 USDC
    tokenSymbol: 'USDC'
  }),
  (req: X402Request, res: Response) => {
    const result = runSecurityAudit(req.body);
    res.json({
      success: true,
      service: 'Valkyrie AI Security Sentinel',
      receipt: req.x402Receipt,
      payer: req.x402Payer,
      data: result
    });
  }
);

// Agent 2: Helios EVM Gas Optimizer
app.post(
  '/api/v1/agent/gas-profile',
  requireX402Payment({
    serviceId: 'agent-gas-optimizer',
    description: 'EVM Opcode Gas Profiling & Memory Packing Analysis',
    recipient: '0x222222222222222222222222222222222222402B',
    amountMicroUnits: '15000', // 0.015 USDC
    tokenSymbol: 'USDC'
  }),
  (req: X402Request, res: Response) => {
    const result = runGasOptimizer(req.body);
    res.json({
      success: true,
      service: 'Helios EVM Gas Optimizer',
      receipt: req.x402Receipt,
      payer: req.x402Payer,
      data: result
    });
  }
);

// Agent 3: ZeroMesh ZK-SNARK Prover
app.post(
  '/api/v1/agent/zk-proof',
  requireX402Payment({
    serviceId: 'agent-zk-prover',
    description: 'Groth16 Zero-Knowledge State & Solvency Verification Proof',
    recipient: '0x333333333333333333333333333333333333402C',
    amountMicroUnits: '40000', // 0.040 USDC
    tokenSymbol: 'USDC'
  }),
  (req: X402Request, res: Response) => {
    const result = runZkProver(req.body);
    res.json({
      success: true,
      service: 'ZeroMesh ZK-SNARK Prover',
      receipt: req.x402Receipt,
      payer: req.x402Payer,
      data: result
    });
  }
);

// --- Swarm Orchestration Endpoints ---

app.post('/api/v1/swarm/execute', async (req: Request, res: Response) => {
  const missionRequest: SwarmMissionRequest = {
    missionId: `mission_${Date.now()}`,
    title: req.body.title || 'Comprehensive Contract Audit & ZK Solvency Certification',
    targetContractAddress: req.body.targetContractAddress || '0x402F...DeFiVault',
    budgetLimitUSDC: req.body.budgetLimitUSDC || 1.0,
    payload: req.body.payload || {}
  };

  try {
    // Run orchestrator
    const result = await orchestrator.executeMission(missionRequest, (progress) => {
      latestMissionProgress = progress;
    });

    latestMissionProgress = result;
    res.json({
      success: true,
      mission: result,
      clientWallet: orchestrator.getClientAddress()
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

app.get('/api/v1/swarm/latest', (req: Request, res: Response) => {
  res.json({
    mission: latestMissionProgress,
    clientWallet: orchestrator.getClientAddress(),
    clientBalanceUSDC: Number(globalFacilitator.getBalance(orchestrator.getClientAddress())) / 1_000_000
  });
});

// Serve static frontend assets if built
const clientDistPath = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDistPath));

app.get('*', (req: Request, res: Response) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  } else {
    res.status(404).json({ error: 'NOT_FOUND', message: 'API route not found' });
  }
});

app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 Nexus402 Protocol Engine online at http://localhost:${PORT}`);
  console.log(`📡 x402 HTTP 402 Micropayment standard active`);
  console.log(`🛡️ Facilitator contract: ${globalFacilitator.settlementContractAddress}`);
  console.log(`======================================================\n`);
});
