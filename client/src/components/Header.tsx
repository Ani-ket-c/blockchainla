import React from 'react';
import { Cpu, ShieldCheck, Wallet, Droplets, ExternalLink, Zap } from 'lucide-react';

interface HeaderProps {
  balanceUSDC: number;
  walletAddress: string;
  onFaucetClick: () => void;
  isFauceting: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  balanceUSDC,
  walletAddress,
  onFaucetClick,
  isFauceting
}) => {
  const shortAddress = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : '0x...';

  return (
    <header style={{
      borderBottom: '1px solid var(--border-color)',
      background: 'rgba(7, 9, 14, 0.85)',
      backdropFilter: 'blur(12px)',
      position: 'sticky',
      top: 0,
      zIndex: 50
    }}>
      <div style={{
        maxWidth: 1400,
        margin: '0 auto',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)',
            border: '1px solid rgba(0, 242, 254, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 15px rgba(0, 242, 254, 0.3)'
          }}>
            <Zap size={22} color="#00f2fe" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 style={{
                fontFamily: 'var(--font-display)',
                fontSize: 20,
                fontWeight: 700,
                letterSpacing: '-0.02em',
                background: 'linear-gradient(to right, #ffffff, #94a3b8)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                NEXUS<span style={{ color: 'var(--accent-cyan)' }}>402</span>
              </h1>
              <span className="badge badge-cyan">x402 Protocol</span>
              <span className="badge badge-purple">Base Sepolia</span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Autonomous Multi-Agent Service Mesh & SLA-Backed HTTP 402 Settlement
            </p>
          </div>
        </div>

        {/* Right Info & Wallet Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Autonomous Agent Wallet Pill */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: 'rgba(16, 23, 38, 0.9)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '6px 14px',
            borderRadius: 12
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Wallet size={16} color="#00f2fe" />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Orchestrator Agent
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#e2e8f0', fontWeight: 600 }}>
                  {shortAddress}
                </div>
              </div>
            </div>

            <div style={{
              width: 1,
              height: 24,
              background: 'rgba(255, 255, 255, 0.1)'
            }} />

            <div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Balance
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: '#34d399', fontWeight: 700 }}>
                {balanceUSDC.toFixed(4)} USDC
              </div>
            </div>

            <button
              onClick={onFaucetClick}
              disabled={isFauceting}
              title="Claim +25.00 USDC Faucet"
              style={{
                background: 'rgba(0, 242, 254, 0.12)',
                border: '1px solid rgba(0, 242, 254, 0.3)',
                color: '#38bdf8',
                borderRadius: 8,
                padding: '4px 8px',
                cursor: isFauceting ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 11,
                fontWeight: 600,
                transition: 'all 0.2s'
              }}
            >
              <Droplets size={12} />
              {isFauceting ? 'Funding...' : '+25 USDC'}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
