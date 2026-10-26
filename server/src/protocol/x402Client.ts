import { ethers } from 'ethers';
import {
  X402_HEADERS,
  PaymentRequirements,
  PaymentAuthorizationPayload,
  PaymentReceipt
} from './x402Types.js';

export interface AgentCallTelemetry {
  step: 'INITIAL_REQUEST' | 'CHALLENGE_RECEIVED' | 'SIGNING_PAYMENT' | 'SETTLEMENT_VERIFIED' | 'COMPLETED';
  timestamp: number;
  httpStatus: number;
  headersSent?: Record<string, string>;
  headersReceived?: Record<string, string>;
  challenge?: PaymentRequirements;
  signedAuthorization?: PaymentAuthorizationPayload;
  receipt?: PaymentReceipt;
  latencyMs: number;
}

export interface CallResult<T = any> {
  success: boolean;
  data?: T;
  receipt?: PaymentReceipt;
  telemetry: AgentCallTelemetry[];
  error?: string;
}

export class AutonomousX402Client {
  public wallet: ethers.HDNodeWallet | ethers.Wallet;
  public readonly agentName: string;

  constructor(privateKeyOrWallet?: string | ethers.HDNodeWallet | ethers.Wallet, agentName = 'Autonomous-Client-Agent') {
    if (!privateKeyOrWallet) {
      // Generate a dedicated autonomous agent wallet if none provided
      this.wallet = ethers.Wallet.createRandom();
    } else if (typeof privateKeyOrWallet === 'string') {
      this.wallet = new ethers.Wallet(privateKeyOrWallet);
    } else {
      this.wallet = privateKeyOrWallet;
    }
    this.agentName = agentName;
  }

  public getAddress(): string {
    return this.wallet.address;
  }

  /**
   * Invokes an x402 protected endpoint autonomously, handling the 402 challenge negotiation transparently
   */
  public async callEndpoint<T = any>(
    url: string,
    options: {
      method?: 'GET' | 'POST';
      body?: any;
      maxBudgetUSDC?: number;
    } = {}
  ): Promise<CallResult<T>> {
    const telemetry: AgentCallTelemetry[] = [];
    const startTime = Date.now();
    const method = options.method || (options.body ? 'POST' : 'GET');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      [X402_HEADERS.AGENT_IDENTITY]: this.agentName
    };

    // --- Step 1: Initial Unpaid Probe Request ---
    telemetry.push({
      step: 'INITIAL_REQUEST',
      timestamp: Date.now(),
      httpStatus: 0,
      headersSent: { ...headers },
      latencyMs: 0
    });

    const initResp = await fetch(url, {
      method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    // Check if endpoint is not protected
    if (initResp.status === 200) {
      const data = await initResp.json();
      telemetry.push({
        step: 'COMPLETED',
        timestamp: Date.now(),
        httpStatus: 200,
        latencyMs: Date.now() - startTime
      });
      return { success: true, data, telemetry };
    }

    // Step 2: Handle HTTP 402 Payment Required
    if (initResp.status !== 402) {
      const errText = await initResp.text();
      return {
        success: false,
        error: `Unexpected HTTP status ${initResp.status}: ${errText}`,
        telemetry
      };
    }

    // Extract challenge from header or response body
    let challenge: PaymentRequirements;
    const reqHeader = initResp.headers.get(X402_HEADERS.PAYMENT_REQUIRED) || initResp.headers.get(X402_HEADERS.PAYMENT_REQUIRED.toLowerCase());
    
    if (reqHeader) {
      try {
        challenge = JSON.parse(Buffer.from(reqHeader, 'base64').toString('utf-8'));
      } catch {
        challenge = JSON.parse(reqHeader);
      }
    } else {
      const bodyJson = await initResp.json();
      challenge = bodyJson.challenge;
    }

    telemetry.push({
      step: 'CHALLENGE_RECEIVED',
      timestamp: Date.now(),
      httpStatus: 402,
      challenge,
      latencyMs: Date.now() - startTime
    });

    // Verify budget guardrail
    const costInUSDC = Number(challenge.amount) / 1_000_000;
    if (options.maxBudgetUSDC !== undefined && costInUSDC > options.maxBudgetUSDC) {
      return {
        success: false,
        error: `Service cost of ${costInUSDC} USDC exceeds agent budget constraint of ${options.maxBudgetUSDC} USDC`,
        telemetry
      };
    }

    // --- Step 3: Sign EIP-712 Payment Authorization ---
    const domain = {
      name: 'Nexus402 Protocol',
      version: '1.0.0',
      chainId: challenge.chainId,
      verifyingContract: challenge.settlementContract
    };

    const types = {
      PaymentAuthorization: [
        { name: 'payer', type: 'address' },
        { name: 'recipient', type: 'address' },
        { name: 'token', type: 'address' },
        { name: 'amount', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
        { name: 'serviceHash', type: 'bytes32' }
      ]
    };

    const value = {
      payer: this.wallet.address,
      recipient: challenge.recipient,
      token: challenge.token,
      amount: BigInt(challenge.amount),
      nonce: BigInt(challenge.nonce),
      deadline: BigInt(challenge.deadline),
      serviceHash: challenge.serviceHash
    };

    // Autonomous cryptographic signing
    const signature = await this.wallet.signTypedData(domain, types, value);

    const signedAuth: PaymentAuthorizationPayload = {
      payer: this.wallet.address,
      recipient: challenge.recipient,
      token: challenge.token,
      amount: challenge.amount,
      nonce: challenge.nonce,
      deadline: challenge.deadline,
      serviceHash: challenge.serviceHash,
      chainId: challenge.chainId,
      signature
    };

    telemetry.push({
      step: 'SIGNING_PAYMENT',
      timestamp: Date.now(),
      httpStatus: 402,
      signedAuthorization: signedAuth,
      latencyMs: Date.now() - startTime
    });

    // --- Step 4: Retry Request with Attached Payment Payload ---
    const base64Auth = Buffer.from(JSON.stringify(signedAuth)).toString('base64');
    const paymentHeaders = {
      ...headers,
      [X402_HEADERS.PAYMENT_SIGNATURE]: base64Auth
    };

    const paidResp = await fetch(url, {
      method,
      headers: paymentHeaders,
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    if (paidResp.status !== 200) {
      const errBody = await paidResp.text();
      return {
        success: false,
        error: `Settlement rejected with status ${paidResp.status}: ${errBody}`,
        telemetry
      };
    }

    // Extract receipt
    let receipt: PaymentReceipt | undefined;
    const respHeader = paidResp.headers.get(X402_HEADERS.PAYMENT_RESPONSE) || paidResp.headers.get(X402_HEADERS.PAYMENT_RESPONSE.toLowerCase());
    if (respHeader) {
      try {
        receipt = JSON.parse(Buffer.from(respHeader, 'base64').toString('utf-8'));
      } catch {
        receipt = JSON.parse(respHeader);
      }
    }

    const data = await paidResp.json();

    telemetry.push({
      step: 'SETTLEMENT_VERIFIED',
      timestamp: Date.now(),
      httpStatus: 200,
      receipt,
      latencyMs: Date.now() - startTime
    });

    return {
      success: true,
      data,
      receipt,
      telemetry
    };
  }
}
