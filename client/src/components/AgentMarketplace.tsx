import React, { useState } from 'react';
import { Shield, Flame, Binary, ArrowRight, Zap, CheckCircle2, Clock } from 'lucide-react';

interface AgentMarketplaceProps {
  onRefreshBalance: () => void;
  onSelectTaskToInspect: (task: any) => void;
}

export const AgentMarketplace: React.FC<AgentMarketplaceProps> = ({
  onRefreshBalance,
  onSelectTaskToInspect
}) => {
  const [callingAgentId, setCallingAgentId] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<any>(null);

  const agents = [
    {
      id: 'agent-security',
      name: 'Valkyrie Security Sentinel',
      category: 'Security Analysis',
      icon: <Shield size={20} color="#f43f5e" />,
      endpoint: '/api/v1/agent/security-audit',
      priceUSD: '$0.025',
      costUSDC: '0.0250 USDC',
      reputation: '99.4%',
      sla: '420ms',
      totalCalls: '14,208',
      description: 'Zero-custody automated vulnerability audit, reentrancy scanning, and formal verification assertions.'
    },
    {
      id: 'agent-gas-optimizer',
      name: 'Helios EVM Gas Optimizer',
      category: 'Compute Profiling',
      icon: <Flame size={20} color="#f59e0b" />,
      endpoint: '/api/v1/agent/gas-profile',
      priceUSD: '$0.015',
      costUSDC: '0.0150 USDC',
      reputation: '98.7%',
      sla: '290ms',
      totalCalls: '38,450',
      description: 'Opcode-level profiling, memory packing, custom assembly suggestions, and cold SSTORE reductions.'
    },
    {
      id: 'agent-zk-prover',
      name: 'ZeroMesh ZK Prover',
      category: 'ZK-SNARK Proofs',
      icon: <Binary size={20} color="#8b5cf6" />,
      endpoint: '/api/v1/agent/zk-proof',
      priceUSD: '$0.040',
      costUSDC: '0.0400 USDC',
      reputation: '99.9%',
      sla: '650ms',
      totalCalls: '9,120',
      description: 'Groth16 / BN254 zero-knowledge solvency verification proofs and on-chain state attestations.'
    }
  ];

  const handleTestCall = async (agent: typeof agents[0]) => {
    setCallingAgentId(agent.id);
    try {
      // Direct call via swarm orchestrator client
      const resp = await fetch('/api/v1/swarm/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Single Test Call: ${agent.name}`,
          targetContractAddress: 'DemoSingleTest.sol',
          budgetLimitUSDC: 0.1,
          payload: { sourceSnippet: 'contract DemoSingleTest { uint256 count; }' }
        })
      });

      const data = await resp.json();
      if (data.success && data.mission) {
        const subtask = data.mission.subtasks.find((t: any) => t.agentId === agent.id) || data.mission.subtasks[0];
        setLastResult({
          agentName: agent.name,
          data: subtask.responsePayload,
          receipt: subtask.receipt,
          cost: agent.costUSDC
        });
        onSelectTaskToInspect(subtask);
        onRefreshBalance();
      }
    } catch (err) {
      console.error('Test call error:', err);
    } finally {
      setCallingAgentId(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="glass-panel" style={{ padding: 20 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
          x402 Agent Microservices Directory
        </h3>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          Each specialist microservice below is wrapped with the <code style={{ color: 'var(--accent-cyan)' }}>requireX402Payment()</code> middleware. AI agents pay per invocation with zero prepaid accounts or credit cards.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 18 }}>
        {agents.map(a => (
          <div key={a.id} className="glass-panel glass-panel-interactive" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {a.icon}
                </div>
                <div>
                  <h4 style={{ fontSize: 15, fontWeight: 700 }}>{a.name}</h4>
                  <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{a.category}</span>
                </div>
              </div>
              <span className="badge badge-cyan">{a.priceUSD}</span>
            </div>

            <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 16 }}>
              {a.description}
            </p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 8,
              background: 'rgba(0,0,0,0.3)',
              padding: '10px 12px',
              borderRadius: 8,
              marginBottom: 16,
              textAlign: 'center'
            }}>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Reputation</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#34d399', marginTop: 2 }}>{a.reputation}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase' }}>SLA Latency</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0', marginTop: 2 }}>{a.sla}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Calls Served</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-cyan)', marginTop: 2 }}>{a.totalCalls}</div>
              </div>
            </div>

            <button
              onClick={() => handleTestCall(a)}
              disabled={callingAgentId === a.id}
              className="btn-secondary"
              style={{ width: '100%', justifyContent: 'center', fontSize: 12 }}
            >
              <Zap size={14} color="#00f2fe" />
              {callingAgentId === a.id ? 'Settling x402 Handshake...' : `Pay & Call (${a.costUSDC})`}
            </button>
          </div>
        ))}
      </div>

      {lastResult && (
        <div className="glass-panel" style={{ padding: 18, borderLeft: '3px solid #10b981' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <CheckCircle2 size={16} color="#10b981" />
            <strong style={{ fontSize: 13, color: '#f8fafc' }}>
              Standalone x402 Call Complete: {lastResult.agentName}
            </strong>
            <span className="badge badge-emerald">Receipt: {lastResult.receipt?.receiptId}</span>
          </div>
          <pre style={{
            background: 'rgba(0,0,0,0.4)',
            padding: 10,
            borderRadius: 6,
            fontSize: 11,
            color: '#94a3b8',
            maxHeight: 140,
            overflowY: 'auto',
            fontFamily: 'var(--font-mono)'
          }}>
            {JSON.stringify(lastResult.data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};
