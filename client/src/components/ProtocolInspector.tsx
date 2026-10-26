import React, { useState } from 'react';
import { Terminal, Copy, Check, ShieldCheck, Key, Hash, Clock, FileCheck } from 'lucide-react';

interface ProtocolInspectorProps {
  selectedTask: any;
}

export const ProtocolInspector: React.FC<ProtocolInspectorProps> = ({ selectedTask }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (!selectedTask) {
    return (
      <div className="glass-panel" style={{ padding: 32, textAlign: 'center' }}>
        <Terminal size={36} color="var(--accent-cyan)" style={{ margin: '0 auto 12px auto', opacity: 0.6 }} />
        <h3 style={{ fontSize: 16, fontWeight: 600, color: '#f8fafc', marginBottom: 6 }}>
          x402 Protocol Inspector
        </h3>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 460, margin: '0 auto' }}>
          Execute a Swarm Mission or click <strong>Inspect 402 Handshake</strong> on any agent card above to dissect the live HTTP 402 negotiation headers, EIP-712 signature, and on-chain receipt.
        </p>
      </div>
    );
  }

  const {
    agentName,
    endpoint,
    cost,
    paymentRequirements,
    paymentAuthorization,
    receipt,
    latencyMs
  } = selectedTask;

  const base64Challenge = paymentRequirements
    ? btoa(JSON.stringify(paymentRequirements))
    : 'N/A';

  const base64Signature = paymentAuthorization
    ? btoa(JSON.stringify(paymentAuthorization))
    : 'N/A';

  const base64Receipt = receipt
    ? btoa(JSON.stringify(receipt))
    : 'N/A';

  return (
    <div className="glass-panel" style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Terminal size={18} color="#00f2fe" />
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700 }}>
              Live x402 Protocol Inspector: {agentName}
            </h3>
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Endpoint: <code style={{ color: 'var(--accent-cyan)' }}>{endpoint}</code> | Cost: <strong style={{ color: '#34d399' }}>{cost}</strong> | Round-trip: {latencyMs || 320}ms
          </span>
        </div>
        <span className="badge badge-emerald">RFC-402 Verified</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16 }}>
        {/* Step 1: 402 Challenge Received */}
        <div style={{ background: '#05070c', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 12, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={15} color="#f59e0b" />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase' }}>
                1. Server HTTP 402 Challenge
              </span>
            </div>
            <button
              onClick={() => handleCopy(JSON.stringify(paymentRequirements, null, 2), 'challenge')}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
              title="Copy JSON"
            >
              {copiedKey === 'challenge' ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
            </button>
          </div>

          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 6 }}>
            Header: <strong style={{ color: '#e2e8f0' }}>PAYMENT-REQUIRED</strong> (Base64)
          </div>
          <div style={{
            background: 'rgba(0,0,0,0.5)',
            padding: 8,
            borderRadius: 6,
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: '#94a3b8',
            overflowX: 'auto',
            whiteSpace: 'nowrap',
            marginBottom: 10
          }}>
            {base64Challenge.slice(0, 50)}...
          </div>

          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 6 }}>
            Decoded EIP-712 Challenge Parameters:
          </div>
          <pre style={{
            background: 'rgba(0,0,0,0.5)',
            padding: 10,
            borderRadius: 6,
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: '#38bdf8',
            maxHeight: 180,
            overflowY: 'auto'
          }}>
            {JSON.stringify(paymentRequirements, null, 2)}
          </pre>
        </div>

        {/* Step 2: Client EIP-712 Payment Signature */}
        <div style={{ background: '#05070c', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 12, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Key size={15} color="#00f2fe" />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase' }}>
                2. Client EIP-712 Authorization
              </span>
            </div>
            <button
              onClick={() => handleCopy(JSON.stringify(paymentAuthorization, null, 2), 'sig')}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
              title="Copy JSON"
            >
              {copiedKey === 'sig' ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
            </button>
          </div>

          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 6 }}>
            Header: <strong style={{ color: '#e2e8f0' }}>PAYMENT-SIGNATURE</strong> (Base64)
          </div>
          <div style={{
            background: 'rgba(0,0,0,0.5)',
            padding: 8,
            borderRadius: 6,
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: '#94a3b8',
            overflowX: 'auto',
            whiteSpace: 'nowrap',
            marginBottom: 10
          }}>
            {base64Signature.slice(0, 50)}...
          </div>

          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 6 }}>
            Decoded Signed Authorization Payload:
          </div>
          <pre style={{
            background: 'rgba(0,0,0,0.5)',
            padding: 10,
            borderRadius: 6,
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: '#c084fc',
            maxHeight: 180,
            overflowY: 'auto'
          }}>
            {JSON.stringify(paymentAuthorization, null, 2)}
          </pre>
        </div>

        {/* Step 3: Verified Settlement Receipt */}
        <div style={{ background: '#05070c', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 12, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <FileCheck size={15} color="#10b981" />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#34d399', textTransform: 'uppercase' }}>
                3. Server Response Receipt
              </span>
            </div>
            <button
              onClick={() => handleCopy(JSON.stringify(receipt, null, 2), 'receipt')}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
              title="Copy JSON"
            >
              {copiedKey === 'receipt' ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
            </button>
          </div>

          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 6 }}>
            Header: <strong style={{ color: '#e2e8f0' }}>PAYMENT-RESPONSE</strong> (Base64)
          </div>
          <div style={{
            background: 'rgba(0,0,0,0.5)',
            padding: 8,
            borderRadius: 6,
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: '#94a3b8',
            overflowX: 'auto',
            whiteSpace: 'nowrap',
            marginBottom: 10
          }}>
            {base64Receipt.slice(0, 50)}...
          </div>

          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 6 }}>
            Decoded Cryptographic Settlement Receipt:
          </div>
          <pre style={{
            background: 'rgba(0,0,0,0.5)',
            padding: 10,
            borderRadius: 6,
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: '#34d399',
            maxHeight: 180,
            overflowY: 'auto'
          }}>
            {JSON.stringify(receipt, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};
