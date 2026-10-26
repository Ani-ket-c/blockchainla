import React, { useEffect, useState } from 'react';
import { Wallet, Droplets, RefreshCw, Key, ExternalLink, Check, Copy, Shield } from 'lucide-react';

interface WalletTerminalProps {
  balanceUSDC: number;
  walletAddress: string;
  onFaucetClick: () => void;
  isFauceting: boolean;
  onRefreshBalance: () => void;
}

export const WalletTerminal: React.FC<WalletTerminalProps> = ({
  balanceUSDC,
  walletAddress,
  onFaucetClick,
  isFauceting,
  onRefreshBalance
}) => {
  const [receipts, setReceipts] = useState<any[]>([]);
  const [isLoadingReceipts, setIsLoadingReceipts] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const fetchReceipts = async () => {
    setIsLoadingReceipts(true);
    try {
      const resp = await fetch('/api/v1/receipts');
      const data = await resp.json();
      if (data.receipts) {
        setReceipts(data.receipts);
      }
    } catch (err) {
      console.error('Error fetching receipts:', err);
    } finally {
      setIsLoadingReceipts(false);
    }
  };

  useEffect(() => {
    fetchReceipts();
  }, [balanceUSDC]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Wallet Details Header */}
      <div className="glass-panel" style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.15) 0%, rgba(16, 185, 129, 0.15) 100%)',
              border: '1px solid rgba(0, 242, 254, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Wallet size={24} color="#00f2fe" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#f8fafc' }}>
                  Autonomous Agent Custody & Faucet
                </h3>
                <span className="badge badge-cyan">EIP-712 Signer</span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                This keypair is held in memory by the autonomous orchestrator agent, signing EIP-712 micro-authorizations automatically upon receiving HTTP 402 challenges.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={onRefreshBalance}
              className="btn-secondary"
              style={{ padding: '8px 12px' }}
              title="Refresh Balance"
            >
              <RefreshCw size={14} />
            </button>
            <button
              onClick={onFaucetClick}
              disabled={isFauceting}
              className="btn-primary"
              style={{ padding: '8px 16px', fontSize: 13 }}
            >
              <Droplets size={14} />
              {isFauceting ? 'Claiming Faucet...' : 'Claim +25.00 USDC'}
            </button>
          </div>
        </div>

        {/* Balance & Address Card */}
        <div style={{
          marginTop: 20,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 16
        }}>
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: 16, borderRadius: 10 }}>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 4 }}>
              Agent EVM Address
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--accent-cyan)' }}>
                {walletAddress}
              </span>
              <button
                onClick={() => handleCopy(walletAddress, 'addr')}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
              >
                {copiedText === 'addr' ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.3)', padding: 16, borderRadius: 10 }}>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 4 }}>
              Available Micro-Payment Balance
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#34d399', fontFamily: 'var(--font-mono)' }}>
              {balanceUSDC.toFixed(4)} USDC
            </div>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.3)', padding: 16, borderRadius: 10 }}>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 4 }}>
              Settlement Engine
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#f8fafc', marginTop: 4 }}>
              Nexus402Settlement.sol (Base Sepolia)
            </div>
          </div>
        </div>
      </div>

      {/* Settlement Receipts Table */}
      <div className="glass-panel" style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h4 style={{ fontSize: 16, fontWeight: 700 }}>
            On-Chain Cryptographic Receipts Ledger ({receipts.length})
          </h4>
          <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
            Facilitator Address: 0x402Facilitator...0000
          </span>
        </div>

        {receipts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-dim)', fontSize: 13 }}>
            No settlements yet. Execute a Swarm Mission to generate verifiable HTTP 402 payment receipts.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', textAlign: 'left', color: 'var(--text-dim)' }}>
                  <th style={{ padding: '10px 12px' }}>Receipt ID</th>
                  <th style={{ padding: '10px 12px' }}>Payer (Agent)</th>
                  <th style={{ padding: '10px 12px' }}>Recipient (Service)</th>
                  <th style={{ padding: '10px 12px' }}>Amount</th>
                  <th style={{ padding: '10px 12px' }}>Auth Hash</th>
                  <th style={{ padding: '10px 12px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map(r => (
                  <tr key={r.receiptId} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                      {r.receiptId}
                    </td>
                    <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      {r.payer.slice(0, 6)}...{r.payer.slice(-4)}
                    </td>
                    <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      {r.recipient.slice(0, 6)}...{r.recipient.slice(-4)}
                    </td>
                    <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', color: '#34d399', fontWeight: 600 }}>
                      {r.formattedAmount}
                    </td>
                    <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
                      {r.authHash.slice(0, 10)}...
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span className="badge badge-emerald">SETTLED</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
