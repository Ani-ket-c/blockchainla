import { describe, it, expect, beforeAll } from 'vitest';
import { ethers } from 'ethers';
import { Nexus402Facilitator } from '../server/src/protocol/x402Facilitator.js';
import { AutonomousX402Client } from '../server/src/protocol/x402Client.js';
import { PaymentAuthorizationPayload } from '../server/src/protocol/x402Types.js';

describe('Nexus402 Core Protocol Specification Tests', () => {
  let facilitator: Nexus402Facilitator;
  let testAgentWallet: ethers.HDNodeWallet | ethers.Wallet;
  let recipientAddress: string;

  beforeAll(() => {
    facilitator = new Nexus402Facilitator();
    testAgentWallet = ethers.Wallet.createRandom();
    recipientAddress = '0x111111111111111111111111111111111111402A';
  });

  it('should generate a valid RFC-402 challenge with EIP-712 parameters', () => {
    const challenge = facilitator.createChallenge({
      serviceId: 'agent-security-test',
      description: 'Vulnerability Audit Test',
      recipient: recipientAddress,
      amountMicroUnits: '25000',
      tokenSymbol: 'USDC'
    });

    expect(challenge.protocol).toBe('x402');
    expect(challenge.version).toBe('1.0');
    expect(challenge.amount).toBe('25000');
    expect(challenge.tokenSymbol).toBe('USDC');
    expect(challenge.recipient).toBe(recipientAddress);
    expect(challenge.serviceHash).toBeDefined();
    expect(challenge.nonce).toBeGreaterThan(0);
    expect(challenge.deadline).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it('should successfully verify a valid EIP-712 payment authorization and issue a receipt', async () => {
    const challenge = facilitator.createChallenge({
      serviceId: 'agent-security-test',
      description: 'Vulnerability Audit Test',
      recipient: recipientAddress,
      amountMicroUnits: '25000',
      tokenSymbol: 'USDC'
    });

    const domain = facilitator.getDomain();
    const types = facilitator.getTypes();

    const value = {
      payer: testAgentWallet.address,
      recipient: challenge.recipient,
      token: challenge.token,
      amount: BigInt(challenge.amount),
      nonce: BigInt(challenge.nonce),
      deadline: BigInt(challenge.deadline),
      serviceHash: challenge.serviceHash
    };

    const signature = await testAgentWallet.signTypedData(domain, types, value);

    const authPayload: PaymentAuthorizationPayload = {
      payer: testAgentWallet.address,
      recipient: challenge.recipient,
      token: challenge.token,
      amount: challenge.amount,
      nonce: challenge.nonce,
      deadline: challenge.deadline,
      serviceHash: challenge.serviceHash,
      chainId: challenge.chainId,
      signature
    };

    const initialPayerBalance = facilitator.getBalance(testAgentWallet.address);

    const result = facilitator.verifyAndSettle(authPayload);

    expect(result.success).toBe(true);
    expect(result.receipt).toBeDefined();
    expect(result.receipt?.status).toBe('SETTLED');
    expect(result.receipt?.payer).toBe(testAgentWallet.address);
    expect(result.receipt?.recipient).toBe(recipientAddress);
    expect(result.receipt?.amount).toBe('25000');

    // Balance should be debited
    const finalPayerBalance = facilitator.getBalance(testAgentWallet.address);
    expect(finalPayerBalance).toBe(initialPayerBalance - 25000n);
  });

  it('should reject replay attacks when the same nonce is submitted again', async () => {
    const challenge = facilitator.createChallenge({
      serviceId: 'agent-replay-test',
      description: 'Replay prevention test',
      recipient: recipientAddress,
      amountMicroUnits: '10000',
      tokenSymbol: 'USDC'
    });

    const value = {
      payer: testAgentWallet.address,
      recipient: challenge.recipient,
      token: challenge.token,
      amount: BigInt(challenge.amount),
      nonce: BigInt(challenge.nonce),
      deadline: BigInt(challenge.deadline),
      serviceHash: challenge.serviceHash
    };

    const signature = await testAgentWallet.signTypedData(
      facilitator.getDomain(),
      facilitator.getTypes(),
      value
    );

    const authPayload: PaymentAuthorizationPayload = {
      payer: testAgentWallet.address,
      recipient: challenge.recipient,
      token: challenge.token,
      amount: challenge.amount,
      nonce: challenge.nonce,
      deadline: challenge.deadline,
      serviceHash: challenge.serviceHash,
      chainId: challenge.chainId,
      signature
    };

    // First settlement succeeds
    const firstAttempt = facilitator.verifyAndSettle(authPayload);
    expect(firstAttempt.success).toBe(true);

    // Second settlement with identical nonce must fail
    const replayAttempt = facilitator.verifyAndSettle(authPayload);
    expect(replayAttempt.success).toBe(false);
    expect(replayAttempt.error).toContain('Replay Protection');
  });

  it('should reject forged signatures from an imposter key', async () => {
    const imposterWallet = ethers.Wallet.createRandom();

    const challenge = facilitator.createChallenge({
      serviceId: 'agent-forgery-test',
      description: 'Forgery test',
      recipient: recipientAddress,
      amountMicroUnits: '10000',
      tokenSymbol: 'USDC'
    });

    const value = {
      payer: testAgentWallet.address, // Claims to be testAgentWallet
      recipient: challenge.recipient,
      token: challenge.token,
      amount: BigInt(challenge.amount),
      nonce: BigInt(challenge.nonce),
      deadline: BigInt(challenge.deadline),
      serviceHash: challenge.serviceHash
    };

    // Signed by imposter key
    const forgedSignature = await imposterWallet.signTypedData(
      facilitator.getDomain(),
      facilitator.getTypes(),
      value
    );

    const authPayload: PaymentAuthorizationPayload = {
      payer: testAgentWallet.address,
      recipient: challenge.recipient,
      token: challenge.token,
      amount: challenge.amount,
      nonce: challenge.nonce,
      deadline: challenge.deadline,
      serviceHash: challenge.serviceHash,
      chainId: challenge.chainId,
      signature: forgedSignature
    };

    const result = facilitator.verifyAndSettle(authPayload);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Cryptographic signature mismatch');
  });
});
