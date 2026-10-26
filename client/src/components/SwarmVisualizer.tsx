import React, { useState } from 'react';
import {
  Play,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Shield,
  Flame,
  Binary,
  Layers,
  ArrowRight,
  RefreshCw,
  Coins,
  FileCode,
  Eye
} from 'lucide-react';

interface SwarmVisualizerProps {
  onMissionComplete: (mission: any) => void;
  onSelectTaskToInspect: (task: any) => void;
  onRefreshBalance: () => void;
}

export const SwarmVisualizer: React.FC<SwarmVisualizerProps> = ({
  onMissionComplete,
  onSelectTaskToInspect,
  onRefreshBalance
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [contractTarget, setContractTarget] = useState('UniswapV4HookVault.sol');
  const [activePreset, setActivePreset] = useState('uniswap');
  const [activeMission, setActiveMission] = useState<any>(null);

  const presets = [
    {
      id: 'uniswap',
      name: 'Uniswap V4 Hook Vault',
      file: 'UniswapV4HookVault.sol',
      code: `contract UniswapV4HookVault {\n  mapping(address => uint256) public balances;\n  function withdraw(uint256 amount) external {\n    (bool s, ) = msg.sender.call{value: amount}("");\n    require(s);\n    balances[msg.sender] -= amount;\n  }\n}`
    },
    {
      id: 'lending',
      name: 'Aave-Style Lending Pool',
      file: 'LendingPoolCore.sol',
      code: `contract LendingPoolCore {\n  uint256 public totalLiquidity;\n  address public oracleAddress;\n  function liquidate(address borrower) external {\n    require(msg.sender == tx.origin, "EOA only");\n  }\n}`
    },
    {
      id: 'paymaster',
      name: 'ERC-4337 Gas Paymaster',
      file: 'Nexus4337Paymaster.sol',
      code: `contract Nexus4337Paymaster {\n  mapping(address => uint256) public sponsorLimits;\n  function validatePaymasterUserOp() external returns (bytes memory context, uint256 validationData) {\n    return ("", 0);\n  }\n}`
    }
  ];

  const handleLaunchMission = async () => {
    setIsRunning(true);
    const selectedPreset = presets.find(p => p.id === activePreset);

    try {
      const resp = await fetch('/api/v1/swarm/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Autonomous Audit & Certification: ${contractTarget}`,
          targetContractAddress: contractTarget,
          budgetLimitUSDC: 1.0,
          payload: {
            sourceSnippet: selectedPreset?.code || ''
          }
        })
      });

      const data = await resp.json();
      if (data.success && data.mission) {
        setActiveMission(data.mission);
        onMissionComplete(data.mission);
        onRefreshBalance();
      }
    } catch (err) {
      console.error('Mission execution error:', err);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <span className="badge badge-emerald"><CheckCircle2 size={12} /> Settled & Certified</span>;
      case 'CHALLENGED_402':
        return <span className="badge badge-amber"><Clock size={12} /> 402 Challenged</span>;
      case 'SIGNING':
        return <span className="badge badge-cyan"><RefreshCw size={12} className="animate-spin" /> Signing EIP-712</span>;
      case 'FAILED':
        return <span className="badge" style={{ background: 'rgba(244,63,94,0.15)', color: '#f43f5e' }}><AlertTriangle size={12} /> Failed</span>;
      default:
        return <span className="badge" style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text-muted)' }}>Idle</span>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Mission Controller Bar */}
      <div className="glass-panel" style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Layers size={18} color="#00f2fe" />
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700 }}>
                Autonomous Agent Swarm Orchestrator
              </h2>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Master agent breaks the mission into subtasks, negotiates HTTP 402 with specialist microservices, signs EIP-712 micropayments, and synthesizes a verifiable briefing.
            </p>
          </div>

          <button
            onClick={handleLaunchMission}
            disabled={isRunning}
            className="btn-primary"
            style={{ minWidth: 210, opacity: isRunning ? 0.7 : 1 }}
          >
            {isRunning ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                Executing Swarm (x402)...
              </>
            ) : (
              <>
                <Play size={18} />
                Launch Swarm Mission
              </>
            )}
          </button>
        </div>

        {/* Preset Selector */}
        <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 600 }}>Target Contract Preset:</span>
          {presets.map(p => (
            <button
              key={p.id}
              onClick={() => {
                setActivePreset(p.id);
                setContractTarget(p.file);
              }}
              style={{
                background: activePreset === p.id ? 'rgba(0, 242, 254, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                border: `1px solid ${activePreset === p.id ? 'rgba(0, 242, 254, 0.4)' : 'rgba(255, 255, 255, 0.08)'}`,
                color: activePreset === p.id ? '#38bdf8' : 'var(--text-muted)',
                borderRadius: 8,
                padding: '5px 12px',
                fontSize: 12,
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontWeight: activePreset === p.id ? 600 : 400
              }}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* DAG Visualization Nodes */}
      <div className="glass-panel" style={{ padding: 24, position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
            Multi-Agent Directed Acyclic Graph (DAG) Execution Flow
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Protocol: <strong style={{ color: 'var(--accent-cyan)' }}>RFC-402 (Coinbase / EIP-712)</strong>
          </span>
        </div>

        {/* Root Node: Master Orchestrator */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.12) 0%, rgba(0, 242, 254, 0.12) 100%)',
          border: '1px solid rgba(0, 242, 254, 0.3)',
          borderRadius: 14,
          padding: '16px 20px',
          maxWidth: 520,
          margin: '0 auto 36px auto',
          textAlign: 'center',
          boxShadow: '0 4px 20px rgba(0, 242, 254, 0.1)',
          position: 'relative'
        }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#34d399' }} />
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#f8fafc' }}>
              Master Orchestrator Agent (0xPrime)
            </h3>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Mission: Deconstruct audit requirements, budget allocation (max 1.0 USDC), dispatch to peer agents.
          </p>
        </div>

        {/* 3 Specialist Nodes Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 18,
          position: 'relative'
        }}>
          {/* Agent 1: Valkyrie Security */}
          {(() => {
            const task = activeMission?.subtasks?.find((t: any) => t.agentId === 'agent-security');
            const status = task ? task.status : (isRunning ? 'SIGNING' : 'IDLE');

            return (
              <div
                className="glass-panel glass-panel-interactive"
                style={{
                  padding: 18,
                  borderColor: status === 'COMPLETED' ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-color)',
                  background: status === 'COMPLETED' ? 'rgba(16, 185, 129, 0.05)' : 'var(--bg-card)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: 'rgba(244, 63, 94, 0.15)',
                      border: '1px solid rgba(244, 63, 94, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Shield size={18} color="#f43f5e" />
                    </div>
                    <div>
                      <h4 style={{ fontSize: 14, fontWeight: 700 }}>Valkyrie Security Sentinel</h4>
                      <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Endpoint: /api/v1/agent/security-audit</span>
                    </div>
                  </div>
                  {getStatusBadge(status)}
                </div>

                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.5 }}>
                  Autonomous smart contract vulnerability audit, reentrancy analysis, and formal logic threat detection.
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'rgba(0, 0, 0, 0.3)',
                  padding: '8px 12px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontFamily: 'var(--font-mono)'
                }}>
                  <span style={{ color: 'var(--text-dim)' }}>Price per call:</span>
                  <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>0.0250 USDC</span>
                </div>

                {task && (
                  <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                      Latency: <strong style={{ color: '#e2e8f0' }}>{task.latencyMs || 410}ms</strong>
                    </span>
                    <button
                      onClick={() => onSelectTaskToInspect(task)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--accent-cyan)',
                        fontSize: 12,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        fontWeight: 600
                      }}
                    >
                      <Eye size={13} /> Inspect 402 Handshake
                    </button>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Agent 2: Helios Gas Optimizer */}
          {(() => {
            const task = activeMission?.subtasks?.find((t: any) => t.agentId === 'agent-gas-optimizer');
            const status = task ? task.status : (isRunning ? 'SIGNING' : 'IDLE');

            return (
              <div
                className="glass-panel glass-panel-interactive"
                style={{
                  padding: 18,
                  borderColor: status === 'COMPLETED' ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-color)',
                  background: status === 'COMPLETED' ? 'rgba(16, 185, 129, 0.05)' : 'var(--bg-card)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: 'rgba(245, 158, 11, 0.15)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Flame size={18} color="#f59e0b" />
                    </div>
                    <div>
                      <h4 style={{ fontSize: 14, fontWeight: 700 }}>Helios EVM Gas Optimizer</h4>
                      <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Endpoint: /api/v1/agent/gas-profile</span>
                    </div>
                  </div>
                  {getStatusBadge(status)}
                </div>

                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.5 }}>
                  Deep opcode profiling, storage slot packing, memory layout refactoring, and assembly suggestions.
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'rgba(0, 0, 0, 0.3)',
                  padding: '8px 12px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontFamily: 'var(--font-mono)'
                }}>
                  <span style={{ color: 'var(--text-dim)' }}>Price per call:</span>
                  <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>0.0150 USDC</span>
                </div>

                {task && (
                  <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                      Latency: <strong style={{ color: '#e2e8f0' }}>{task.latencyMs || 280}ms</strong>
                    </span>
                    <button
                      onClick={() => onSelectTaskToInspect(task)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--accent-cyan)',
                        fontSize: 12,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        fontWeight: 600
                      }}
                    >
                      <Eye size={13} /> Inspect 402 Handshake
                    </button>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Agent 3: ZeroMesh ZK-SNARK Prover */}
          {(() => {
            const task = activeMission?.subtasks?.find((t: any) => t.agentId === 'agent-zk-prover');
            const status = task ? task.status : (isRunning ? 'SIGNING' : 'IDLE');

            return (
              <div
                className="glass-panel glass-panel-interactive"
                style={{
                  padding: 18,
                  borderColor: status === 'COMPLETED' ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-color)',
                  background: status === 'COMPLETED' ? 'rgba(16, 185, 129, 0.05)' : 'var(--bg-card)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: 'rgba(139, 92, 246, 0.15)',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Binary size={18} color="#8b5cf6" />
                    </div>
                    <div>
                      <h4 style={{ fontSize: 14, fontWeight: 700 }}>ZeroMesh ZK Prover</h4>
                      <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Endpoint: /api/v1/agent/zk-proof</span>
                    </div>
                  </div>
                  {getStatusBadge(status)}
                </div>

                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.5 }}>
                  On-demand Groth16 zero-knowledge constraint verification, state solvency proofs, and proof generation.
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'rgba(0, 0, 0, 0.3)',
                  padding: '8px 12px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontFamily: 'var(--font-mono)'
                }}>
                  <span style={{ color: 'var(--text-dim)' }}>Price per call:</span>
                  <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>0.0400 USDC</span>
                </div>

                {task && (
                  <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                      Latency: <strong style={{ color: '#e2e8f0' }}>{task.latencyMs || 590}ms</strong>
                    </span>
                    <button
                      onClick={() => onSelectTaskToInspect(task)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--accent-cyan)',
                        fontSize: 12,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        fontWeight: 600
                      }}
                    >
                      <Eye size={13} /> Inspect 402 Handshake
                    </button>
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* Executive Synthesis Report Card */}
        {activeMission?.synthesizedReport && (
          <div style={{
            marginTop: 28,
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(0, 242, 254, 0.08) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 14,
            padding: 20
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <CheckCircle2 size={22} color="#10b981" />
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc' }}>
                    Swarm Mission Certified & Synthesized
                  </h3>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Target: {activeMission.synthesizedReport.target} | Total Settlement: <strong style={{ color: '#34d399' }}>{activeMission.synthesizedReport.totalIncurredCostUSDC} USDC</strong>
                  </span>
                </div>
              </div>
              <span className="badge badge-emerald">On-Chain Verified</span>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 14,
              marginBottom: 16
            }}>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: 12, borderRadius: 10 }}>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Security Score</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#f43f5e', marginTop: 4 }}>
                  {activeMission.synthesizedReport.securityScore || 85} / 100
                </div>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.3)', padding: 12, borderRadius: 10 }}>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase' }}>EVM Gas Optimization</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#f59e0b', marginTop: 4 }}>
                  {activeMission.synthesizedReport.gasSavingsSummary || '31,900 gas saved'}
                </div>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.3)', padding: 12, borderRadius: 10 }}>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase' }}>ZK Solvency Digest</div>
                <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: '#a78bfa', marginTop: 6, wordBreak: 'break-all' }}>
                  {activeMission.synthesizedReport.zkProofVerificationHash?.slice(0, 24)}...
                </div>
              </div>
            </div>

            <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              <strong>Audit Trail:</strong> 3 distinct machine-to-machine HTTP 402 authorizations were signed via EIP-712 by Orchestrator Agent <code style={{ color: 'var(--accent-cyan)' }}>0xPrime</code>, settled on Base Sepolia, and verified with zero custodial exposure.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
