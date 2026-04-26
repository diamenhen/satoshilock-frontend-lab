'use client';
import Link from 'next/link';
import { useAccount, useChainId, useBalance } from 'wagmi';
import { useEffect, useState } from 'react';
import { getActiveLockAddress } from './config/wagmi';

const NETWORK_NAMES = {
  1: 'ETHEREUM',
  11155111: 'SEPOLIA',
  8453: 'BASE',
  84532: 'BASE_SEPOLIA',
  56: 'BSC',
  97: 'BSC_TESTNET',
};

function shortAddr(a) { return a ? a.slice(0,6) + '...' + a.slice(-4) : '-'; }

export default function Home() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { data: balance } = useBalance({ address });
  const networkName = NETWORK_NAMES[chainId] || `CHAIN_${chainId}`;
  const contractAddress = getActiveLockAddress(chainId);

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  return (
    <div style={S.page}>
      {/* HERO ASCII */}
      <section style={S.hero}>
        <div style={S.cmdLine}>
          {'>'} ./welcome --user={mounted && isConnected ? shortAddr(address) : 'guest'}
        </div>
        <pre style={S.ascii}>{`
 _      _____  ______
| |    |  _  ||  ___ \\
| |    | |_| || |_/ /
| |    |     ||  __ /
| |____| | | || |.__\\
\\_____/\\_| |_/\\_|
`}</pre>
        <div style={S.heroDesc}>Token vesting, programmable. Now with extend &amp; top up.</div>
        <div style={S.heroSubtitle}>// Lock // Vest // Extend // Top up</div>

        <div style={S.ctaRow}>
          <Link href="/create" style={{...S.ctaPrimary, textDecoration:'none'}}>
            [ CREATE.LOCK ]
          </Link>
          <Link href="/locks" style={{...S.ctaSecondary, textDecoration:'none'}}>
            [ MY.LOCKS ]
          </Link>
        </div>
      </section>

      {/* STATUS GRID */}
      <section style={S.statusGrid}>
        <div style={S.statBox}>
          <div style={S.statLabel}>NETWORK</div>
          <div style={S.statValue}>{mounted ? networkName : '...'}</div>
        </div>
        <div style={{...S.statBox, ...S.statBoxMid}}>
          <div style={S.statLabel}>WALLET</div>
          <div style={S.statValue}>
            {mounted && isConnected ? shortAddr(address) : 'NOT_CONNECTED'}
          </div>
        </div>
        <div style={{...S.statBox, ...S.statBoxMid}}>
          <div style={S.statLabel}>BALANCE</div>
          <div style={S.statValue}>
            {mounted && balance
              ? `${parseFloat(balance.formatted).toFixed(4)} ${balance.symbol}`
              : '-'}
          </div>
        </div>
        <div style={S.statBox}>
          <div style={S.statLabel}>CONTRACT</div>
          <div style={S.statValue}>
            {mounted && contractAddress ? shortAddr(contractAddress) : '-'}
          </div>
        </div>
      </section>

      {/* INFO PANEL */}
      <section style={S.infoPanel}>
        <div style={S.infoHeader}>{'>'} CMD: cat README.txt</div>
        <div style={S.infoBody}>
          <div style={S.infoLine}>// SatoshiLock Lab is an experimental fork of the production protocol.</div>
          <div style={S.infoLine}>// Locks are deployed to <span style={S.accent}>SEPOLIA TESTNET</span> only — no real funds.</div>
          <div style={S.infoLine}>// Two new mechanics:</div>
          <div style={{...S.infoLine, paddingLeft: 20}}>● <span style={S.accent}>EXTEND</span> — push endTime forward (+1d, +1w, +1mo, +3mo, +6mo, +1yr)</div>
          <div style={{...S.infoLine, paddingLeft: 20}}>● <span style={S.accent}>TOP_UP</span> — pour additional tokens into a live schedule</div>
          <div style={S.infoLine}>// All other mechanics (vest, cliff, claim, cancel) match production.</div>
        </div>
      </section>

      {/* CMD LINE FOOTER */}
      <section style={S.footer}>
        <span>// built_by: <a href="https://x.com/AriantheChain" target="_blank" rel="noopener noreferrer" style={S.footerLink}>@AriantheChain</a></span>
        <span>// status: LIVE</span>
        <span>// last_sync: {mounted ? new Date().toISOString().slice(0,10) : '...'}</span>
      </section>
    </div>
  );
}

const COLORS = {
  bg: '#0a0a0a',
  fg: '#00ff88',
  fgDim: 'rgba(0,255,136,0.6)',
  fgMute: 'rgba(0,255,136,0.4)',
  border: '#00ff88',
};

const S = {
  page: {
    minHeight: 'calc(100vh - 100px)',
    background: COLORS.bg,
    color: COLORS.fg,
    fontFamily: '"JetBrains Mono", "Fira Code", "Courier New", monospace',
    padding: '24px 32px 40px',
    maxWidth: 920,
    margin: '0 auto',
  },
  hero: {
    border: `1px solid ${COLORS.border}`,
    padding: '24px 28px 32px',
    marginBottom: 16,
  },
  cmdLine: {
    fontSize: 11,
    color: COLORS.fgDim,
    letterSpacing: '0.05em',
    marginBottom: 14,
  },
  ascii: {
    fontSize: 11,
    lineHeight: 1.2,
    color: COLORS.fg,
    margin: '0 0 16px',
    fontFamily: 'inherit',
    whiteSpace: 'pre',
  },
  heroDesc: {
    fontSize: 14,
    color: COLORS.fg,
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 11,
    color: COLORS.fgMute,
    marginBottom: 24,
  },
  ctaRow: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
  },
  ctaPrimary: {
    background: COLORS.fg,
    color: COLORS.bg,
    padding: '8px 18px',
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.04em',
    fontFamily: 'inherit',
    cursor: 'pointer',
    border: 'none',
    display: 'inline-block',
  },
  ctaSecondary: {
    background: 'transparent',
    color: COLORS.fg,
    padding: '7px 17px',
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.04em',
    fontFamily: 'inherit',
    cursor: 'pointer',
    border: `1px solid ${COLORS.border}`,
    display: 'inline-block',
  },
  statusGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr 1fr',
    border: `1px solid ${COLORS.border}`,
    marginBottom: 16,
  },
  statBox: {
    padding: '14px 18px',
  },
  statBoxMid: {
    borderLeft: `1px dashed ${COLORS.fgMute}`,
    borderRight: `1px dashed ${COLORS.fgMute}`,
  },
  statLabel: {
    fontSize: 10,
    color: COLORS.fgDim,
    letterSpacing: '0.1em',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 13,
    color: COLORS.fg,
    fontWeight: 700,
  },
  infoPanel: {
    border: `1px solid ${COLORS.border}`,
    marginBottom: 16,
  },
  infoHeader: {
    background: COLORS.fg,
    color: COLORS.bg,
    padding: '6px 14px',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.06em',
  },
  infoBody: {
    padding: '14px 18px',
  },
  infoLine: {
    fontSize: 11,
    color: COLORS.fg,
    lineHeight: 1.7,
    opacity: 0.85,
  },
  accent: {
    color: COLORS.fg,
    fontWeight: 700,
    opacity: 1,
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 9,
    color: COLORS.fgMute,
    paddingTop: 12,
    borderTop: `1px dashed ${COLORS.fgMute}`,
  },
  footerLink: {
    color: COLORS.fg,
    textDecoration: 'underline',
  },
};