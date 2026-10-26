import { ethers } from 'ethers';
import {
  PaymentRequirements,
  PaymentAuthorizationPayload,
  PaymentReceipt
} from './x402Types.js';

export class Nexus402Facilitator {
  private usedNonces: Map<string, Set<number>> = new Map();
  private receipts: Map<string, PaymentReceipt> = new Map();
  private agentBalances: Map<string, bigint> = new Map(); // address => balance in micro-units (USDC has 6 decimals)
  
  public readonly settlementContractAddress: string;
  public readonly chainId: number;
  public readonly facilitatorAddress: string;

  constructor(
    settlementContract = '0x4027777777777777777777777777777777777402',
    chainId = 84532 // Base Sepolia
  ) {
    this.settlementContractAddress = settlementContract;
    this.chainId = chainId;
    this.facilitatorAddress = '0x402FacilitatorRelayer00000000000000000000';
  }

  public getDomain() {
    return {
      name: 'Nexus402 Protocol',
      version: '1.0.0',
      chainId: this.chainId,
      verifyingContract: this.settlementContractAddress
    };
  }

  public getTypes() {
    return {
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
  }

  /**
   * Initializes or gets the virtual balance for an agent address
   */
  public getBalance(address: string): bigint {
    const norm = address.toLowerCase();
    if (!this.agentBalances.has(norm)) {
      // Default initial balance of 50.00 USDC (50_000_000 micro-units) for demo/test purposes
      this.agentBalances.set(norm, 50_000_000n);
    }
    return this.agentBalances.get(norm)!;
  }

  /**
   * Faucet to fund an agent wallet
   */
  public fundAgent(address: string, amountMicroUnits: bigint): bigint {
    const norm = address.toLowerCase();
    const current = this.getBalance(norm);
    const updated = current + amountMicroUnits;
    this.agentBalances.set(norm, updated);
    return updated;
  }

  /**
   * Generates a standard x402 Payment Challenge for an API endpoint
   */
  public createChallenge(params: {
    serviceId: string;
    description: string;
    recipient: string;
    amountMicroUnits: string; // e.g. "10000" for $0.01 USDC
    tokenSymbol?: string;
    tokenAddress?: string;
    requestBodyFingerprint?: string;
  }): PaymentRequirements {
    const nonce = Math.floor(Date.now() * 1000 + Math.random() * 1000);
    const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minute validity
    
    // Hash service parameters to lock the payment to this exact payload
    const serviceHash = ethers.keccak256(
      ethers.toUtf8Bytes(
        `${params.serviceId}:${params.requestBodyFingerprint || 'standard'}:${nonce}`
      )
    );

    const amountNum = Number(params.amountMicroUnits) / 1_000_000;
    const formattedAmount = `${amountNum.toFixed(4)} ${params.tokenSymbol || 'USDC'}`;

    return {
      protocol: 'x402',
      version: '1.0',
      network: 'base-sepolia',
      chainId: this.chainId,
      token: params.tokenAddress || '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // Base Sepolia USDC
      tokenSymbol: params.tokenSymbol || 'USDC',
      recipient: params.recipient,
      amount: params.amountMicroUnits,
      formattedAmount,
      serviceId: params.serviceId,
      serviceHash,
      nonce,
      deadline,
      description: params.description,
      settlementContract: this.settlementContractAddress,
      facilitatorUrl: 'https://nexus402.engine.internal/settle'
    };
  }

  /**
   * Verifies an EIP-712 Payment Signature and executes settlement
   */
  public verifyAndSettle(auth: PaymentAuthorizationPayload): {
    success: boolean;
    receipt?: PaymentReceipt;
    error?: string;
  } {
    try {
      const now = Math.floor(Date.now() / 1000);
      if (now > auth.deadline) {
        return { success: false, error: `Authorization expired at ${auth.deadline}, current is ${now}` };
      }

      const payerNorm = auth.payer.toLowerCase();
      const nonces = this.usedNonces.get(payerNorm) || new Set<number>();
      if (nonces.has(auth.nonce)) {
        return { success: false, error: `Nonce ${auth.nonce} has already been settled (Replay Protection)` };
      }

      // Check balance
      const balance = this.getBalance(payerNorm);
      const amountBigInt = BigInt(auth.amount);
      if (balance < amountBigInt) {
        return {
          success: false,
          error: `Insufficient balance: Agent has ${(Number(balance)/1e6).toFixed(4)} USDC, required ${(Number(amountBigInt)/1e6).toFixed(4)} USDC`
        };
      }

      // Construct values for EIP-712 verification
      const value = {
        payer: auth.payer,
        recipient: auth.recipient,
        token: auth.token,
        amount: BigInt(auth.amount),
        nonce: BigInt(auth.nonce),
        deadline: BigInt(auth.deadline),
        serviceHash: auth.serviceHash
      };

      // Recover signer using ethers v6
      const recoveredSigner = ethers.verifyTypedData(
        this.getDomain(),
        this.getTypes(),
        value,
        auth.signature
      );

      if (recoveredSigner.toLowerCase() !== payerNorm) {
        return {
          success: false,
          error: `Cryptographic signature mismatch: expected ${auth.payer}, recovered ${recoveredSigner}`
        };
      }

      // Debit payer, credit recipient in virtual facilitator ledger
      this.agentBalances.set(payerNorm, balance - amountBigInt);
      const recipientNorm = auth.recipient.toLowerCase();
      const recipientBal = this.agentBalances.get(recipientNorm) || 0n;
      this.agentBalances.set(recipientNorm, recipientBal + amountBigInt);

      // Mark nonce as consumed
      nonces.add(auth.nonce);
      this.usedNonces.set(payerNorm, nonces);

      // Create settlement receipt
      const receiptId = `rcpt_${ethers.hexlify(ethers.randomBytes(12)).slice(2)}`;
      const authHash = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ['address', 'address', 'address', 'uint256', 'uint256', 'uint256', 'bytes32'],
          [auth.payer, auth.recipient, auth.token, auth.amount, auth.nonce, auth.deadline, auth.serviceHash]
        )
      );

      const receipt: PaymentReceipt = {
        receiptId,
        settlementType: 'INSTANT_VERIFIED',
        authHash,
        payer: auth.payer,
        recipient: auth.recipient,
        amount: auth.amount,
        formattedAmount: `${(Number(amountBigInt) / 1e6).toFixed(4)} USDC`,
        tokenSymbol: 'USDC',
        serviceHash: auth.serviceHash,
        timestamp: Date.now(),
        blockNumber: 19842000 + Math.floor(Math.random() * 500),
        facilitator: this.facilitatorAddress,
        status: 'SETTLED'
      };

      this.receipts.set(receiptId, receipt);

      return { success: true, receipt };
    } catch (err: any) {
      return { success: false, error: `Verification failed: ${err.message}` };
    }
  }

  public getReceipt(receiptId: string): PaymentReceipt | undefined {
    return this.receipts.get(receiptId);
  }

  public getAllReceipts(): PaymentReceipt[] {
    return Array.from(this.receipts.values()).reverse();
  }
}

export const globalFacilitator = new Nexus402Facilitator();
