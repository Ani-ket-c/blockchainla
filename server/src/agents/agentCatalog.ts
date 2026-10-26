import { AgentServiceDefinition } from '../protocol/x402Types.js';

export const SPECIALIST_AGENTS: AgentServiceDefinition[] = [
  {
    id: 'agent-security',
    name: 'Valkyrie AI Security Sentinel',
    description: 'Autonomous smart contract vulnerability audit, reentrancy analysis, and formal logic threat detection.',
    category: 'Security',
    endpoint: '/api/v1/agent/security-audit',
    costUnits: '25000', // 0.025 USDC
    priceUSD: '$0.025',
    tokenSymbol: 'USDC',
    recipientAddress: '0x111111111111111111111111111111111111402A',
    reputationScore: 99.4,
    slaResponseTimeMs: 420,
    totalCallsServed: 14208
  },
  {
    id: 'agent-gas-optimizer',
    name: 'Helios EVM Gas Optimizer',
    description: 'Deep opcode profiling, storage slot packing, memory layout refactoring, and assembly suggestions.',
    category: 'Compute',
    endpoint: '/api/v1/agent/gas-profile',
    costUnits: '15000', // 0.015 USDC
    priceUSD: '$0.015',
    tokenSymbol: 'USDC',
    recipientAddress: '0x222222222222222222222222222222222222402B',
    reputationScore: 98.7,
    slaResponseTimeMs: 290,
    totalCallsServed: 38450
  },
  {
    id: 'agent-zk-prover',
    name: 'ZeroMesh ZK-SNARK Prover',
    description: 'On-demand Groth16 zero-knowledge constraint verification, state solvency proofs, and proof generation.',
    category: 'ZK-Proof',
    endpoint: '/api/v1/agent/zk-proof',
    costUnits: '40000', // 0.040 USDC
    priceUSD: '$0.040',
    tokenSymbol: 'USDC',
    recipientAddress: '0x333333333333333333333333333333333333402C',
    reputationScore: 99.9,
    slaResponseTimeMs: 650,
    totalCallsServed: 9120
  }
];
