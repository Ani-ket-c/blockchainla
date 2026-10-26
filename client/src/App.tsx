import React, { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { SwarmVisualizer } from './components/SwarmVisualizer';
import { ProtocolInspector } from './components/ProtocolInspector';
import { AgentMarketplace } from './components/AgentMarketplace';
import { WalletTerminal } from './components/WalletTerminal';
import { SDKDocs } from './components/SDKDocs';
import { Layers, Terminal, Store, Wallet, Code2, Sparkles, Activity, ShieldAlert, Cpu } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'swarm' | 'inspector' | 'marketplace' | 'wallet' | 'sdk'>('swarm');
  const [balanceUSDC, setBalanceUSDC] = useState<number>(50.0);
  const [walletAddress, setWalletAddress] = useState<string>('0xbfB263147a516be9Ff0854016331CCFc2FC7939C');
  const [isFauceting, setIsFauceting] = useState(false);
  const [selectedTaskToInspect, setSelectedTaskToInspect] = useState<any>(null);

  const fetchWalletState = async () => {
    try {
      const resp = await fetch('/api/v1/swarm/latest');
      const data = await resp.json();
      if (data.clientWallet) {
        setWalletAddress(data.clientWallet);
      }
      if (typeof data.clientBalanceUSDC === 'number') {
        setBalanceUSDC(data.clientBalanceUSDC);
      }
    } catch (err) {
      console.warn('Could not fetch wallet state:', err);
    }
  };

  useEffect(() => {
    fetchWalletState();
  }, []);

  const handleFaucet = async () => {
    if (!walletAddress) return;
    setIsFauceting(true);
    try {
      const resp = await fetch('/api/v1/faucet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: walletAddress, amountUSDC: 25 })
      });
      const data = await resp.json();
      if (data.success && typeof data.newBalanceUSDC === 'number') {
        setBalanceUSDC(data.newBalanceUSDC);
      }
    } catch (err) {
      console.error('Faucet error:', err);
    } finally {
      setIsFauceting(false);
    }
  };

  const handleSelectTask = (task: any) => {
    setSelectedTaskToInspect(task);
    setActiveTab('inspector');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header
        balanceUSDC={balanceUSDC}
        walletAddress={walletAddress}
        onFaucetClick={handleFaucet}
        isFauceting={isFauceting}
      />

      <main style={{ maxWidth: 1400, margin: '0 auto', padding: '24px', width: '100%', flex: 1 }}>
        {/* Hero Section Banner */}
        <div className="glass-panel" style={{
          padding: '24px 28px',
          marginBottom: 24,
          background: 'linear-gradient(135deg, rgba(16, 23, 38, 0.8) 0%, rgba(13, 18, 29, 0.9) 100%)',
          border: '1px solid rgba(0, 242, 254, 0.2)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 20
        }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Sparkles size={16} color="#00f2fe" />
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-cyan)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Next-Gen Agentic Micropayments
              </span>
            </div>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 26,
              fontWeight: 800,
              letterSpacing: '-0.02em',
              marginBottom: 8,
              color: '#ffffff'
            }}>
              Zero-Custody AI Multi-Agent Service Mesh
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', maxWidth: 680, lineHeight: 1.6 }}>
              Autonomous AI agents cannot sign credit card forms or navigate Web2 checkouts. Nexus402 resurrects the <strong>HTTP 402 ("Payment Required")</strong> standard to allow swarms of AI agents to dynamically negotiate, hire, verify, and settle micro-services using EIP-712 cryptographic proofs on Base.
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div style={{
            display: 'flex',
            gap: 16,
            background: 'rgba(0,0,0,0.4)',
            padding: '12px 20px',
            borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.06)'
          }}>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Protocol</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#38bdf8', marginTop: 2 }}>RFC-402</div>
            </div>
            <div style={{ width: 1, background: 'rgba(255,255,255,0.1)' }} />
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Avg Settlement</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#34d399', marginTop: 2 }}>~380ms</div>
            </div>
            <div style={{ width: 1, background: 'rgba(255,255,255,0.1)' }} />
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Gas Savings</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#c084fc', marginTop: 2 }}>99.2%</div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{
          display: 'flex',
          gap: 10,
          marginBottom: 20,
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          paddingBottom: 12,
          overflowX: 'auto'
        }}>
          <button
            onClick={() => setActiveTab('swarm')}
            className={`tab-btn ${activeTab === 'swarm' ? 'active' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}
          >
            <Layers size={16} />
            Swarm Orchestrator (DAG Studio)
          </button>

          <button
            onClick={() => setActiveTab('inspector')}
            className={`tab-btn ${activeTab === 'inspector' ? 'active' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}
          >
            <Terminal size={16} />
            x402 Protocol Inspector
            {selectedTaskToInspect && <span className="badge badge-cyan" style={{ padding: '1px 6px' }}>Active</span>}
          </button>

          <button
            onClick={() => setActiveTab('marketplace')}
            className={`tab-btn ${activeTab === 'marketplace' ? 'active' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}
          >
            <Store size={16} />
            Agent Directory (Individual Test)
          </button>

          <button
            onClick={() => setActiveTab('wallet')}
            className={`tab-btn ${activeTab === 'wallet' ? 'active' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}
          >
            <Wallet size={16} />
            Agent Wallet & Receipts Ledger
          </button>

          <button
            onClick={() => setActiveTab('sdk')}
            className={`tab-btn ${activeTab === 'sdk' ? 'active' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}
          >
            <Code2 size={16} />
            Developer SDK & Contracts
          </button>
        </div>

        {/* Tab View Render */}
        {activeTab === 'swarm' && (
          <SwarmVisualizer
            onMissionComplete={(mission) => {
              if (mission.subtasks && mission.subtasks.length > 0) {
                setSelectedTaskToInspect(mission.subtasks[0]);
              }
            }}
            onSelectTaskToInspect={handleSelectTask}
            onRefreshBalance={fetchWalletState}
          />
        )}

        {activeTab === 'inspector' && (
          <ProtocolInspector selectedTask={selectedTaskToInspect} />
        )}

        {activeTab === 'marketplace' && (
          <AgentMarketplace
            onRefreshBalance={fetchWalletState}
            onSelectTaskToInspect={handleSelectTask}
          />
        )}

        {activeTab === 'wallet' && (
          <WalletTerminal
            balanceUSDC={balanceUSDC}
            walletAddress={walletAddress}
            onFaucetClick={handleFaucet}
            isFauceting={isFauceting}
            onRefreshBalance={fetchWalletState}
          />
        )}

        {activeTab === 'sdk' && (
          <SDKDocs />
        )}
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border-color)',
        padding: '24px',
        background: 'rgba(7, 9, 14, 0.9)',
        marginTop: 40,
        textAlign: 'center',
        fontSize: 13,
        color: 'var(--text-dim)'
      }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            Built for <strong>Loops House | Road to Devcon VIII</strong> (x402: Pay-Per-Call Track)
          </div>
          <div>
            EIP-712 Standard Compliant &bull; Base Sepolia Settlement &bull; Apache-2.0 / MIT License
          </div>
        </div>
      </footer>
    </div>
  );
};
