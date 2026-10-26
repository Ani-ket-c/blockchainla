import React, { useState } from 'react';
import { Code2, Copy, Check, FileText, Terminal, Layers } from 'lucide-react';

export const SDKDocs: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'express' | 'client' | 'curl' | 'solidity'>('express');
  const [copied, setCopied] = useState(false);

  const snippets = {
    express: `// 1. Install Nexus402 Express Middleware
import express from 'express';
import { requireX402Payment } from '@nexus402/middleware';

const app = express();

// 2. Protect any AI agent capability route with 1 line of middleware:
app.post(
  '/api/v1/agent/inference',
  requireX402Payment({
    serviceId: 'llama-70b-deep-reasoning',
    description: 'Autonomous Llama-3 70B Reasoning Endpoint',
    recipient: '0xYourServiceWalletAddressHere',
    amountMicroUnits: '10000', // 0.0100 USDC per call
    tokenSymbol: 'USDC'
  }),
  (req, res) => {
    // This code only executes once the EIP-712 payment authorization is verified!
    const receipt = req.x402Receipt; // Verifiable cryptographic receipt
    res.json({
      success: true,
      data: { answer: "42 is the ultimate answer." },
      receipt
    });
  }
);`,

    client: `// How an Autonomous Agent automatically consumes an x402 API
import { AutonomousX402Client } from '@nexus402/client';

// 1. Initialize client with autonomous private key (or auto-generate)
const agentClient = new AutonomousX402Client(process.env.AGENT_PRIVATE_KEY);

console.log("Agent Address:", agentClient.getAddress());

// 2. Call the protected endpoint.
// The client detects HTTP 402, parses PAYMENT-REQUIRED challenge,
// signs EIP-712 authorization, and retries automatically!
const result = await agentClient.callEndpoint('https://api.nexus402.org/agent/inference', {
  method: 'POST',
  body: { prompt: "Analyze market liquidity depth" },
  maxBudgetUSDC: 0.05 // Guardrail: never pay more than 0.05 USDC
});

console.log("Response:", result.data);
console.log("Cryptographic Receipt ID:", result.receipt.receiptId);`,

    curl: `# 1. Send initial unpaid request to protected endpoint:
curl -i -X POST http://localhost:4020/api/v1/agent/security-audit \\
  -H "Content-Type: application/json" \\
  -d '{"contractName": "Vault.sol"}'

# -> Response: HTTP/1.1 402 Payment Required
# -> Header: PAYMENT-REQUIRED: eyJwcm90b2NvbCI6Ing0MDIiLCJhbW91bnQiOiIyNTAwMCIsLi4ufQ==

# 2. Agent signs EIP-712 payload and retries:
curl -i -X POST http://localhost:4020/api/v1/agent/security-audit \\
  -H "Content-Type: application/json" \\
  -H "PAYMENT-SIGNATURE: <base64-encoded-eip712-authorization>" \\
  -d '{"contractName": "Vault.sol"}'

# -> Response: HTTP/1.1 200 OK
# -> Header: PAYMENT-RESPONSE: <base64-encoded-receipt>`,

    solidity: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Nexus402Settlement.sol: Verifies EIP-712 signatures & batches micro-transfers
contract Nexus402Settlement {
    bytes32 public constant PAYMENT_AUTH_TYPEHASH = keccak256(
        "PaymentAuthorization(address payer,address recipient,address token,uint256 amount,uint256 nonce,uint256 deadline,bytes32 serviceHash)"
    );

    // Batch settle dozens of off-chain signed agent calls in 1 low-gas transaction:
    function batchSettle(
        PaymentAuthorization[] calldata auths,
        bytes[] calldata signatures
    ) external onlyFacilitator returns (uint256 settledCount, uint256 totalVolume);
}`
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(snippets[activeTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass-panel" style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700 }}>
            Developer Integration SDK & Protocol Specs
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Turn any standard API into a machine-monetized x402 endpoint in under 3 minutes.
          </p>
        </div>

        <button
          onClick={handleCopy}
          className="btn-secondary"
          style={{ padding: '6px 12px', fontSize: 12 }}
        >
          {copied ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
          {copied ? 'Copied Snippet!' : 'Copy Code'}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: 10, marginBottom: 14 }}>
        <button
          onClick={() => setActiveTab('express')}
          className={`tab-btn ${activeTab === 'express' ? 'active' : ''}`}
        >
          Express Middleware
        </button>
        <button
          onClick={() => setActiveTab('client')}
          className={`tab-btn ${activeTab === 'client' ? 'active' : ''}`}
        >
          Autonomous Agent Client
        </button>
        <button
          onClick={() => setActiveTab('curl')}
          className={`tab-btn ${activeTab === 'curl' ? 'active' : ''}`}
        >
          cURL / Raw HTTP
        </button>
        <button
          onClick={() => setActiveTab('solidity')}
          className={`tab-btn ${activeTab === 'solidity' ? 'active' : ''}`}
        >
          Solidity Settlement Contract
        </button>
      </div>

      <pre style={{
        background: '#05070c',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 10,
        padding: 16,
        fontFamily: 'var(--font-mono)',
        fontSize: 12,
        color: '#e2e8f0',
        overflowX: 'auto',
        lineHeight: 1.6
      }}>
        {snippets[activeTab]}
      </pre>
    </div>
  );
};
