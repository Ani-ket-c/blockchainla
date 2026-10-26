/**
 * Nexus402 Core Protocol Specification Types
 * Conforms to the x402 open internet standard (HTTP 402 Payment Required for AI Agents)
 */

export const X402_HEADERS = {
  PAYMENT_REQUIRED: 'PAYMENT-REQUIRED',
  PAYMENT_SIGNATURE: 'PAYMENT-SIGNATURE',
  PAYMENT_RESPONSE: 'PAYMENT-RESPONSE',
  AGENT_IDENTITY: 'X-AGENT-IDENTITY',
  SLA_GUARANTEE: 'X-SLA-GUARANTEE'
} as const;

export interface PaymentRequirements {
  protocol: 'x402';
  version: '1.0';
  network: string; // e.g. 'base-sepolia' | 'base-mainnet' | 'ethereum'
  chainId: number; // e.g. 84532 or 8453
  token: string; // Token contract address or '0x0000000000000000000000000000000000000000'
  tokenSymbol: string; // e.g. 'USDC' | 'ETH'
  recipient: string; // Recipient EVM address
  amount: string; // Raw atomic unit (e.g. 10000 for 0.01 USDC)
  formattedAmount: string; // Human-readable e.g. '0.01 USDC'
  serviceId: string; // Unique capability or endpoint identifier
  serviceHash: string; // SHA-256 / Keccak-256 fingerprint of the request/endpoint
  nonce: number; // Unique replay-prevention nonce
  deadline: number; // Unix timestamp cutoff
  description: string;
  settlementContract: string;
  facilitatorUrl?: string;
}

export interface PaymentAuthorizationPayload {
  payer: string;
  recipient: string;
  token: string;
  amount: string;
  nonce: number;
  deadline: number;
  serviceHash: string;
  chainId: number;
  signature: string; // EIP-712 hex signature
}

export interface PaymentReceipt {
  receiptId: string;
  settlementType: 'INSTANT_VERIFIED' | 'BATCH_ESCROW' | 'STATE_CHANNEL';
  authHash: string;
  payer: string;
  recipient: string;
  amount: string;
  formattedAmount: string;
  tokenSymbol: string;
  serviceHash: string;
  timestamp: number;
  blockNumber?: number;
  facilitator: string;
  status: 'SETTLED' | 'PENDING_BATCH' | 'VERIFIED';
}

export interface AgentServiceDefinition {
  id: string;
  name: string;
  description: string;
  category: 'Security' | 'Compute' | 'ZK-Proof' | 'Analytics' | 'Orchestration';
  endpoint: string;
  costUnits: string; // in atomic token units
  priceUSD: string;
  tokenSymbol: string;
  recipientAddress: string;
  reputationScore: number; // 0-100
  slaResponseTimeMs: number;
  totalCallsServed: number;
}

export interface SwarmMissionRequest {
  missionId: string;
  title: string;
  targetContractAddress?: string;
  payload: any;
  budgetLimitUSDC: number;
}

export interface SwarmSubtask {
  taskId: string;
  agentId: string;
  agentName: string;
  endpoint: string;
  status: 'PENDING' | 'CHALLENGED_402' | 'SIGNING' | 'VERIFYING' | 'SETTLED' | 'COMPLETED' | 'FAILED';
  cost: string;
  requestPayload: any;
  responsePayload?: any;
  paymentRequirements?: PaymentRequirements;
  paymentAuthorization?: PaymentAuthorizationPayload;
  receipt?: PaymentReceipt;
  latencyMs?: number;
  error?: string;
}
