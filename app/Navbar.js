'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Suspense } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useChainId } from 'wagmi';

const NETWORK_NAMES = {
  1: 'ETHEREUM',
  11155111: 'SEPOLIA',
  8453: 'BASE',
  84532: 'BASE_SEPOLIA',
  56: 'BSC',
  97: 'BSC_TESTNET',
};

function shortAddr(a) { return a ? a.slice(0,6) + '...' + a.slice(-4) : '-'; }

function NavbarInner() {
  const pathname = usePathname();
  const chainId = useChainId();
  const networkName = NETWORK_NAMES[chainId] || `CHAIN_${chainId}`;

  const items = [
    { label: '[01] HOME',   href: '/' },
    { label: '[02] CREATE', href: '/create' },
    { label: '[03] LOCKS',  href: '/locks' },
  ];

  return (
    <nav style={navStyle}>
      <div style={topRow}>
        {/* Brand */}
        <Link href="/" style={brandStyle}>
          <span style={dotStyle}>●</span>
          <span>LAB.LOCK_v0.1</span>
        </Link>

        {/* Status */}
        <div style={statusStyle}>
          <span>{networkName}</span>
          <span style={dimStyle}>// CHAIN_ID:{chainId || '...'}</span>
          <span style={statusBadge}>STATUS:LIVE</span>
        </div>

        {/* Connect button */}
        <ConnectButton.Custom>
          {({ account, chain, openConnectModal, openAccountModal, openChainModal, mounted }) => {
            const ready = mounted;
            const connected = ready && account && chain;
            return (
              <div>
                {!connected ? (
                  <button onClick={openConnectModal} style={connectBtn}>
                    CONNECT.WALLET
                  </button>
                ) : chain.unsupported ? (
                  <button onClick={openChainModal} style={connectBtn}>
                    WRONG.NETWORK
                  </button>
                ) : (
                  <button onClick={openAccountModal} style={walletPill}>
                    {shortAddr(account.address)}
                  </button>
                )}
              </div>
            );
          }}
        </ConnectButton.Custom>
      </div>

      {/* Tabs */}
      <div style={tabsRow}>
        {items.map(item => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              style={{ ...tabStyle, ...(isActive ? tabActive : {}) }}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default function Navbar() {
  return (
    <Suspense fallback={null}>
      <NavbarInner />
    </Suspense>
  );
}

const COLORS = {
  bg: '#0a0a0a',
  fg: '#00ff88',
  fgDim: 'rgba(0,255,136,0.6)',
  fgMute: 'rgba(0,255,136,0.4)',
  border: '#00ff88',
};

const navStyle = {
  background: COLORS.bg,
  borderBottom: `1px solid ${COLORS.border}`,
  position: 'sticky',
  top: 0,
  zIndex: 50,
  fontFamily: '"JetBrains Mono", "Fira Code", "Courier New", monospace',
};

const topRow = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '8px 28px',
  borderBottom: `1px dashed ${COLORS.fgMute}`,
  gap: 16,
  fontSize: 11,
  color: COLORS.fg,
};

const brandStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  color: COLORS.fg,
  textDecoration: 'none',
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: '0.04em',
};

const dotStyle = {
  color: COLORS.fg,
  fontSize: 10,
};

const statusStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontSize: 10,
  color: COLORS.fgDim,
  letterSpacing: '0.04em',
};

const dimStyle = {
  opacity: 0.5,
};

const statusBadge = {
  background: COLORS.fg,
  color: COLORS.bg,
  padding: '2px 8px',
  fontWeight: 700,
};

const connectBtn = {
  background: COLORS.fg,
  color: COLORS.bg,
  border: 'none',
  padding: '6px 14px',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.04em',
  fontFamily: 'inherit',
  cursor: 'pointer',
};

const walletPill = {
  background: 'transparent',
  color: COLORS.fg,
  border: `1px solid ${COLORS.border}`,
  padding: '5px 13px',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.04em',
  fontFamily: 'inherit',
  cursor: 'pointer',
};

const tabsRow = {
  display: 'flex',
  alignItems: 'stretch',
  padding: '0',
};

const tabStyle = {
  padding: '10px 18px',
  fontSize: 11,
  color: COLORS.fg,
  textDecoration: 'none',
  fontFamily: 'inherit',
  letterSpacing: '0.04em',
  borderRight: `1px solid ${COLORS.border}`,
  opacity: 0.6,
};

const tabActive = {
  background: COLORS.fg,
  color: COLORS.bg,
  fontWeight: 700,
  opacity: 1,
};