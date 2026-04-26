'use client';
import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  useAccount, useChainId, usePublicClient, useWalletClient, useWaitForTransactionReceipt,
} from 'wagmi';
import { formatUnits, parseUnits, parseEther, isAddress } from 'viem';
import { SATOSHILOCK_V2_ABI, ERC20_ABI, ETH_SENTINEL, AUTH } from '../config/contract-v2';
import { getActiveLockAddress } from '../config/wagmi';

// Inline ABI fragments — bypass any ABI parsing issues
const CLAIM_ABI = [{
  type: 'function',
  name: 'claim',
  stateMutability: 'nonpayable',
  inputs: [{ name: 'lockId', type: 'bytes32' }],
  outputs: [],
}];

const CANCEL_ABI = [{
  type: 'function',
  name: 'cancel',
  stateMutability: 'nonpayable',
  inputs: [{ name: 'lockId', type: 'bytes32' }],
  outputs: [],
}];

const EXTEND_LOCK_ABI = [{
  type: 'function',
  name: 'extendLock',
  stateMutability: 'nonpayable',
  inputs: [
    { name: 'lockId',     type: 'bytes32' },
    { name: 'newEndTime', type: 'uint256' },
  ],
  outputs: [],
}];

const TOPUP_LOCK_ABI = [{
  type: 'function',
  name: 'topUpLock',
  stateMutability: 'nonpayable',
  inputs: [
    { name: 'lockId',           type: 'bytes32' },
    { name: 'additionalAmount', type: 'uint256' },
  ],
  outputs: [],
}];

const TOPUP_LOCK_ETH_ABI = [{
  type: 'function',
  name: 'topUpLockETH',
  stateMutability: 'payable',
  inputs: [
    { name: 'lockId', type: 'bytes32' },
  ],
  outputs: [],
}];

const SECS_DAY = 86400;
const SECS_WEEK = 604800;
const SECS_MONTH = 2592000;
const SECS_YEAR = 31536000;

const EXTEND_PRESETS = [
  { label: '+1 MIN',   secs: 60 },
  { label: '+5 MIN',   secs: 300 },
  { label: '+15 MIN',  secs: 900 },
  { label: '+1 HOUR',  secs: 3600 },
  { label: '+1 DAY',   secs: SECS_DAY },
  { label: '+1 WEEK',  secs: SECS_WEEK },
];

const TOPUP_PRESETS = [10, 25, 50, 100];

function shortAddr(a) { return a ? a.slice(0,6) + '...' + a.slice(-4) : '-'; }
function fmtDate(ts) {
  if (!ts) return '-';
  return new Date(Number(ts) * 1000).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}
function fmtAmount(amount, decimals = 18) {
  if (amount === undefined || amount === null) return '0';
  try { return formatUnits(BigInt(amount), decimals); }
  catch { return '0'; }
}
function friendlyError(err) {
  const msg = err?.shortMessage || err?.message || String(err);
  if (msg.includes('User rejected')) return 'TX_REJECTED_BY_USER';
  if (msg.includes('insufficient')) return 'INSUFFICIENT_FUNDS';
  return msg.slice(0, 140);
}

function isEthLock(lock) {
  if (!lock) return false;
  return lock.token?.toLowerCase() === ETH_SENTINEL.toLowerCase();
}

export default function LocksPage() {
  return (
    <Suspense fallback={<div style={S.loading}>{'>'} loading locks...</div>}>
      <LocksInner />
    </Suspense>
  );
}

function LocksInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'received' ? 'received' : 'created';

  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const contractAddress = getActiveLockAddress(chainId);

  const [tab, setTab] = useState(initialTab);
  const [locks, setLocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  // Modals
  const [extendModalLock, setExtendModalLock] = useState(null);
  const [topupModalLock, setTopupModalLock] = useState(null);

  // Fetch locks
  useEffect(() => {
    if (!isConnected || !address || !contractAddress || !publicClient) {
      setLocks([]);
      return;
    }

    let aborted = false;
    setLoading(true);
    setError('');

    (async () => {
      try {
        const fnName = tab === 'created' ? 'getLocksByCreator' : 'getLocksByRecipient';
        const lockIds = await publicClient.readContract({
          address: contractAddress,
          abi: SATOSHILOCK_V2_ABI,
          functionName: fnName,
          args: [address],
        });

        if (aborted) return;

        if (!lockIds || lockIds.length === 0) {
          setLocks([]);
          setLoading(false);
          return;
        }

        // Fetch lock details + token metadata in parallel
        const lockDetails = await Promise.all(
          lockIds.map(async (id) => {
            try {
              const lock = await publicClient.readContract({
                address: contractAddress,
                abi: SATOSHILOCK_V2_ABI,
                functionName: 'getLock',
                args: [id],
              });

              const isEth = isEthLock(lock);
              let symbol = 'ETH';
              let decimals = 18;
              if (!isEth) {
                try {
                  const [sym, dec] = await Promise.all([
                    publicClient.readContract({ address: lock.token, abi: ERC20_ABI, functionName: 'symbol' }),
                    publicClient.readContract({ address: lock.token, abi: ERC20_ABI, functionName: 'decimals' }),
                  ]);
                  symbol = sym;
                  decimals = Number(dec);
                } catch { symbol = 'TOKEN'; decimals = 18; }
              }

              return { id, lock, symbol, decimals };
            } catch (e) {
              return null;
            }
          })
        );

        if (aborted) return;
        setLocks(lockDetails.filter(Boolean));
        setLoading(false);
      } catch (e) {
        if (!aborted) {
          setError(friendlyError(e));
          setLoading(false);
        }
      }
    })();

    return () => { aborted = true; };
  }, [isConnected, address, contractAddress, publicClient, tab, refreshKey]);

  function refresh() { setRefreshKey(k => k + 1); }

  if (!isConnected) {
    return (
      <div style={S.page}>
        <div style={S.cmdLine}>{'>'} CMD: cat ~/.locks</div>
        <div style={S.emptyBox}>
          {'>'} ERROR: WALLET_NOT_CONNECTED
          <br/>
          {'>'} HINT: connect wallet to view your locks
        </div>
      </div>
    );
  }

  if (!contractAddress) {
    return (
      <div style={S.page}>
        <div style={S.cmdLine}>{'>'} CMD: cat ~/.locks</div>
        <div style={S.emptyBox}>
          {'>'} ERROR: UNSUPPORTED_NETWORK
          <br/>
          {'>'} HINT: switch to SEPOLIA testnet
        </div>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <div style={S.cmdLine}>{'>'} CMD: ./list_locks.sh --user={shortAddr(address)}</div>

      {/* Tab switcher */}
      <div style={S.tabRow}>
        <button
          style={{...S.tab, ...(tab === 'created' ? S.tabActive : {})}}
          onClick={() => setTab('created')}>
          [01] CREATED_BY_ME
        </button>
        <button
          style={{...S.tab, ...(tab === 'received' ? S.tabActive : {})}}
          onClick={() => setTab('received')}>
          [02] RECEIVED
        </button>
        <button style={S.refreshBtn} onClick={refresh} title="Refresh">⟳ RELOAD</button>
      </div>

      {error && <div style={S.errBox}>! ERROR: {error}</div>}

      {loading && <div style={S.statusLine}>{'>'} fetching locks from chain...</div>}

      {!loading && locks.length === 0 && (
        <div style={S.emptyBox}>
          {'>'} NO_LOCKS_FOUND ({tab === 'created' ? 'as creator' : 'as recipient'})
          <br/>
          {tab === 'created' && (
            <>
              {'>'} HINT: <a href="/create" style={S.link}>./create_lock.sh</a>
            </>
          )}
        </div>
      )}

      {!loading && locks.length > 0 && (
        <div style={S.lockList}>
          {[...locks].sort((a, b) => {
            const aDone = BigInt(a.lock.withdrawnAmount) >= BigInt(a.lock.totalAmount);
            const bDone = BigInt(b.lock.withdrawnAmount) >= BigInt(b.lock.totalAmount);
            if (aDone !== bDone) return aDone ? 1 : -1;
            return Number(b.lock.startTime) - Number(a.lock.startTime);
          }).map((entry, i) => (
            <LockCard
              key={entry.id}
              entry={entry}
              index={i}
              userAddress={address}
              tab={tab}
              onExtend={() => setExtendModalLock(entry)}
              onTopup={() => setTopupModalLock(entry)}
              onAction={refresh}
              contractAddress={contractAddress}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {extendModalLock && (
        <ExtendModal
          entry={extendModalLock}
          contractAddress={contractAddress}
          onClose={() => setExtendModalLock(null)}
          onSuccess={() => { setExtendModalLock(null); refresh(); }}
        />
      )}
      {topupModalLock && (
        <TopupModal
          entry={topupModalLock}
          contractAddress={contractAddress}
          onClose={() => setTopupModalLock(null)}
          onSuccess={() => { setTopupModalLock(null); refresh(); }}
        />
      )}
    </div>
  );
}

function LockCard({ entry, index, userAddress, tab, onExtend, onTopup, onAction, contractAddress }) {
  const { id, lock, symbol, decimals } = entry;
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [actionLoading, setActionLoading] = useState('');
  const [actionError, setActionError] = useState('');

  const [now, setNow] = useState(Math.floor(Date.now() / 1000));
  useEffect(() => {
    const tick = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(tick);
  }, []);
  // BigInt-based math (matches production V2 — no float precision loss)
  const totalBI = BigInt(lock.totalAmount);
  const withdrawnBI = BigInt(lock.withdrawnAmount);
  const cliffAmtBI = BigInt(lock.cliffAmount || 0);
  const startTs = Number(lock.startTime);
  const endTs = Number(lock.endTime);
  const cliffTs = Number(lock.cliffTime);
  const freqSecs = Number(lock.freqSecs) || 1;

  let vestedBI = 0n;
  if (now >= endTs) {
    vestedBI = totalBI;
  } else if (now >= cliffTs) {
    const remaining = totalBI - cliffAmtBI;
    const totalSecs = endTs - startTs;
    const totalSteps = Math.max(1, Math.floor(totalSecs / freqSecs));
    const elapsed = now - startTs;
    const stepsElapsed = Math.min(totalSteps, Math.floor(elapsed / freqSecs));
    vestedBI = cliffAmtBI + (remaining * BigInt(stepsElapsed)) / BigInt(totalSteps);
  }
  const claimableBI = vestedBI > withdrawnBI ? vestedBI - withdrawnBI : 0n;

  const totalAmount = Number(formatUnits(totalBI, decimals));
  const withdrawn = Number(formatUnits(withdrawnBI, decimals));
  const vestedAmt = Number(formatUnits(vestedBI, decimals));
  const claimableAmt = Number(formatUnits(claimableBI, decimals));
  const vestedPct = totalAmount > 0 ? (vestedAmt / totalAmount) * 100 : 0;

  const claimedPct = totalAmount > 0 ? (withdrawn / totalAmount) * 100 : 0;
  const isCreator = lock.creator?.toLowerCase() === userAddress?.toLowerCase();
  const isRecipient = lock.recipient?.toLowerCase() === userAddress?.toLowerCase();
  const canCancel = (lock.cancelAuth === AUTH.BOTH) ||
    (lock.cancelAuth === AUTH.CREATOR && isCreator) ||
    (lock.cancelAuth === AUTH.RECIPIENT && isRecipient);

  const status = now >= endTs ? 'COMPLETE' : (now < cliffTs ? 'CLIFF' : 'ACTIVE');

  async function handleClaim() {
    if (!walletClient || !publicClient) return;
    setActionLoading('claim');
    setActionError('');
    try {
      const hash = await walletClient.writeContract({
        address: contractAddress,
        abi: CLAIM_ABI,
        functionName: 'claim',
        args: [id],
        account: userAddress,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      setActionLoading('');
      onAction();
    } catch (e) {
      setActionError(friendlyError(e));
      setActionLoading('');
    }
  }

  async function handleCancel() {
    if (!walletClient || !publicClient) return;
    if (!confirm('Cancel lock? Vested goes to recipient, rest refunded to creator.')) return;
    setActionLoading('cancel');
    setActionError('');
    try {
      const hash = await walletClient.writeContract({
        address: contractAddress,
        abi: CANCEL_ABI,
        functionName: 'cancel',
        args: [id],
        account: userAddress,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      setActionLoading('');
      onAction();
    } catch (e) {
      setActionError(friendlyError(e));
      setActionLoading('');
    }
  }

  const idShort = id.slice(0, 6) + '...' + id.slice(-4);
  const lockNum = String(index + 1).padStart(3, '0');

  return (
    <div style={S.lockCard}>
      <div style={S.cardHeader}>
        <div style={{ fontWeight: 700 }}>[LOCK_{lockNum}]</div>
        <div style={S.cardId}>id: {idShort}</div>
      </div>

      <div style={S.cardStats}>
        <Stat label="AMOUNT"     value={`${Number(totalAmount).toFixed(4)} ${symbol}`} />
        <Stat label="VESTED"      value={`${vestedPct.toFixed(1)}%`} />
        <Stat label="CLAIMED"      value={`${claimedPct.toFixed(1)}%`} />
        <Stat label="STATUS"        value={status} accent={status==='ACTIVE'} />
      </div>

      <div style={S.cardMeta}>
        <div>{'>'} CREATOR:    {shortAddr(lock.creator)}</div>
        <div>{'>'} RECIPIENT:  {shortAddr(lock.recipient)}</div>
        <div>{'>'} START:      {fmtDate(startTs)}</div>
        <div>{'>'} END:        {fmtDate(endTs)}</div>
        <div>{'>'} CLIFF:      {fmtDate(cliffTs)}</div>
      </div>

      {actionError && <div style={S.errInline}>! {actionError}</div>}

      <div style={S.cardActions}>
        {isRecipient && status === 'COMPLETE' && claimableAmt > 0.000001 && (
          <button style={S.btnPrimary}
            onClick={handleClaim}
            disabled={actionLoading === 'claim'}>
            {actionLoading === 'claim' ? '...' : '[ CLAIM ]'}
          </button>
        )}
        {isCreator && status !== 'COMPLETE' && (
          <>
            <button style={S.btnSecondary} onClick={onExtend}>
              [ EXTEND ]
            </button>
            <button style={S.btnSecondary} onClick={onTopup}>
              [ TOPUP ]
            </button>
          </>
        )}
        {canCancel && status !== 'COMPLETE' && (
          <button style={S.btnDanger}
            onClick={handleCancel}
            disabled={actionLoading === 'cancel'}>
            {actionLoading === 'cancel' ? '...' : '[ CANCEL ]'}
          </button>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div>
      <div style={S.statLabel}>{label}</div>
      <div style={accent ? S.statValueAccent : S.statValue}>{value}</div>
    </div>
  );
}

const EXTEND_UNITS = [
  { label: 'MIN',   value: 60 },
  { label: 'HOUR',  value: 3600 },
  { label: 'DAY',   value: 86400 },
  { label: 'WEEK',  value: 604800 },
  { label: 'MONTH', value: 2592000 },
  { label: 'YEAR',  value: 31536000 },
];

function ExtendModal({ entry, contractAddress, onClose, onSuccess }) {
  const { id, lock } = entry;
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [extendValue, setExtendValue] = useState('');
  const [extendUnit, setExtendUnit] = useState(60);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const currentEnd = Number(lock.endTime);
  const addSecs = Math.floor((parseFloat(extendValue) || 0) * extendUnit);
  const newEnd = addSecs > 0 ? currentEnd + addSecs : null;

  async function handleExtend() {
    if (!newEnd || !walletClient || !publicClient) return;
    setLoading(true);
    setError('');
    try {
      const hash = await walletClient.writeContract({
        address: contractAddress,
        abi: EXTEND_LOCK_ABI,
        functionName: 'extendLock',
        args: [id, BigInt(newEnd)],
        account: address,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      setLoading(false);
      onSuccess();
    } catch (e) {
      setError(friendlyError(e));
      setLoading(false);
    }
  }

  return (
    <div style={S.modalOverlay} onClick={onClose}>
      <div style={S.modalCard} onClick={e => e.stopPropagation()}>
        <div style={S.modalHeader}>
          {'>'} EXTEND_LOCK [{id.slice(0,8)}...]
          <button style={S.modalClose} onClick={onClose}>[X]</button>
        </div>
        <div style={S.modalBody}>
          <div style={S.modalLine}>{'>'} current end:  {fmtDate(currentEnd)}</div>
          <div style={S.modalLine}>{'>'} new end:      {newEnd ? fmtDate(newEnd) : '(enter duration)'}</div>

          <div style={{...S.modalLabel, marginTop: 14}}>{'>'} extend by:</div>
          <div style={{display: 'flex', gap: 8}}>
            <input
              style={{...S.input, flex: 1}}
              type="number"
              min="0"
              placeholder="0"
              value={extendValue}
              onChange={e => setExtendValue(e.target.value)} />
            <select
              style={S.select}
              value={extendUnit}
              onChange={e => setExtendUnit(Number(e.target.value))}>
              {EXTEND_UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
          </div>

          {error && <div style={S.errInline}>! {error}</div>}

          <button
            style={{...S.btnPrimary, width: '100%', marginTop: 14}}
            disabled={!newEnd || loading}
            onClick={handleExtend}>
            {loading ? '[ EXTENDING... ]' : '[ CONFIRM.EXTEND ]'}
          </button>
        </div>
      </div>
    </div>
  );
}

function TopupModal({ entry, contractAddress, onClose, onSuccess }) {
  const { id, lock, symbol, decimals } = entry;
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [selectedPct, setSelectedPct] = useState(null);
  const [customAmount, setCustomAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const totalAmount = Number(formatUnits(lock.totalAmount, decimals));
  const presetAmount = selectedPct ? (totalAmount * selectedPct / 100) : null;
  const finalAmount = customAmount ? parseFloat(customAmount) : presetAmount;
  const isEth = isEthLock(lock);

  async function handleTopup() {
    if (!finalAmount || finalAmount <= 0 || !walletClient || !publicClient) return;
    setLoading(true);
    setError('');
    try {
      const amountUnits = isEth
        ? parseEther(String(finalAmount))
        : parseUnits(String(finalAmount), decimals);

      if (isEth) {
        const hash = await walletClient.writeContract({
          address: contractAddress,
          abi: TOPUP_LOCK_ETH_ABI,
          functionName: 'topUpLockETH',
          args: [id],
          value: amountUnits,
          account: address,
        });
        await publicClient.waitForTransactionReceipt({ hash });
      } else {
        // 1. Approve
        const approveHash = await walletClient.writeContract({
          address: lock.token,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [contractAddress, amountUnits],
          account: address,
        });
        await publicClient.waitForTransactionReceipt({ hash: approveHash });

        // 2. topUpLock
        const hash = await walletClient.writeContract({
          address: contractAddress,
          abi: TOPUP_LOCK_ABI,
          functionName: 'topUpLock',
          args: [id, amountUnits],
          account: address,
        });
        await publicClient.waitForTransactionReceipt({ hash });
      }
      setLoading(false);
      onSuccess();
    } catch (e) {
      setError(friendlyError(e));
      setLoading(false);
    }
  }

  return (
    <div style={S.modalOverlay} onClick={onClose}>
      <div style={S.modalCard} onClick={e => e.stopPropagation()}>
        <div style={S.modalHeader}>
          {'>'} TOPUP_LOCK [{id.slice(0,8)}...]
          <button style={S.modalClose} onClick={onClose}>[X]</button>
        </div>
        <div style={S.modalBody}>
          <div style={S.modalLine}>{'>'} current locked: {totalAmount.toFixed(4)} {symbol}</div>
          <div style={S.modalLine}>{'>'} adding:         {finalAmount ? finalAmount.toFixed(4) : '(none)'} {symbol}</div>
          <div style={S.modalLine}>{'>'} new total:      {finalAmount ? (totalAmount + finalAmount).toFixed(4) : '-'} {symbol}</div>

          <div style={{...S.modalLabel, marginTop: 14}}>{'>'} preset (% of current):</div>
          <div style={{...S.presetGrid, gridTemplateColumns: 'repeat(4, 1fr)'}}>
            {TOPUP_PRESETS.map(p => (
              <button
                key={p}
                style={{
                  ...S.presetBtn,
                  ...(selectedPct === p && !customAmount ? S.presetBtnActive : {}),
                }}
                onClick={() => { setSelectedPct(p); setCustomAmount(''); }}>
                +{p}%
              </button>
            ))}
          </div>

          <div style={{...S.modalLabel, marginTop: 14}}>{'>'} custom amount:</div>
          <input
            style={S.input}
            type="number"
            min="0"
            placeholder="0.000"
            value={customAmount}
            onChange={e => { setCustomAmount(e.target.value); setSelectedPct(null); }} />

          {error && <div style={S.errInline}>! {error}</div>}

          <button
            style={{...S.btnPrimary, width: '100%', marginTop: 14}}
            disabled={!finalAmount || finalAmount <= 0 || loading}
            onClick={handleTopup}>
            {loading ? '[ TOPPING_UP... ]' : '[ CONFIRM.TOPUP ]'}
          </button>
        </div>
      </div>
    </div>
  );
}

const COLORS = {
  bg: '#0a0a0a',
  fg: '#00ff88',
  fgDim: 'rgba(0,255,136,0.6)',
  fgMute: 'rgba(0,255,136,0.4)',
  err: '#ff4444',
  border: '#00ff88',
};

const S = {
  page: {
    background: COLORS.bg,
    color: COLORS.fg,
    fontFamily: '"JetBrains Mono", "Fira Code", "Courier New", monospace',
    padding: '24px 32px 60px',
    maxWidth: 920,
    margin: '0 auto',
    minHeight: 'calc(100vh - 100px)',
  },
  loading: {
    color: COLORS.fgDim,
    padding: 24,
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 12,
  },
  cmdLine: {
    fontSize: 11,
    color: COLORS.fgDim,
    letterSpacing: '0.05em',
    marginBottom: 16,
  },
  tabRow: {
    display: 'flex',
    gap: 0,
    border: `1px solid ${COLORS.border}`,
    marginBottom: 14,
  },
  tab: {
    flex: 1,
    background: 'transparent',
    color: COLORS.fg,
    border: 'none',
    borderRight: `1px solid ${COLORS.border}`,
    padding: '8px 16px',
    fontSize: 11,
    fontFamily: 'inherit',
    cursor: 'pointer',
    letterSpacing: '0.04em',
    opacity: 0.6,
  },
  tabActive: {
    background: COLORS.fg,
    color: COLORS.bg,
    fontWeight: 700,
    opacity: 1,
  },
  refreshBtn: {
    background: 'transparent',
    color: COLORS.fg,
    border: 'none',
    padding: '8px 14px',
    fontSize: 10,
    fontFamily: 'inherit',
    cursor: 'pointer',
    letterSpacing: '0.04em',
  },
  emptyBox: {
    border: `1px dashed ${COLORS.fgMute}`,
    padding: '24px 18px',
    fontSize: 11,
    color: COLORS.fgDim,
    lineHeight: 1.8,
  },
  statusLine: {
    fontSize: 11,
    color: COLORS.fgDim,
    padding: '14px 0',
  },
  errBox: {
    fontSize: 11,
    color: COLORS.err,
    border: `1px solid ${COLORS.err}`,
    padding: '8px 12px',
    marginBottom: 12,
  },
  errInline: {
    fontSize: 10,
    color: COLORS.err,
    margin: '8px 0',
  },
  link: {
    color: COLORS.fg,
    textDecoration: 'underline',
  },
  lockList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  lockCard: {
    border: `1px solid ${COLORS.border}`,
    padding: '14px 18px',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 12,
    marginBottom: 12,
  },
  cardId: {
    color: COLORS.fgDim,
    fontSize: 11,
  },
  cardStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 10,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottom: `1px dashed ${COLORS.fgMute}`,
  },
  statLabel: {
    fontSize: 9,
    color: COLORS.fgDim,
    letterSpacing: '0.1em',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 12,
    color: COLORS.fg,
    fontWeight: 700,
  },
  statValueAccent: {
    fontSize: 12,
    color: COLORS.fg,
    fontWeight: 700,
  },
  cardMeta: {
    fontSize: 10,
    color: COLORS.fgDim,
    lineHeight: 1.6,
    marginBottom: 12,
  },
  cardActions: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },
  btnPrimary: {
    background: COLORS.fg,
    color: COLORS.bg,
    border: 'none',
    padding: '6px 14px',
    fontSize: 11,
    fontFamily: 'inherit',
    fontWeight: 700,
    letterSpacing: '0.04em',
    cursor: 'pointer',
  },
  btnSecondary: {
    background: 'transparent',
    color: COLORS.fg,
    border: `1px solid ${COLORS.border}`,
    padding: '5px 13px',
    fontSize: 11,
    fontFamily: 'inherit',
    fontWeight: 700,
    letterSpacing: '0.04em',
    cursor: 'pointer',
  },
  btnDanger: {
    background: 'transparent',
    color: COLORS.err,
    border: `1px solid ${COLORS.err}`,
    padding: '5px 13px',
    fontSize: 11,
    fontFamily: 'inherit',
    fontWeight: 700,
    letterSpacing: '0.04em',
    cursor: 'pointer',
    marginLeft: 'auto',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0, 0, 0, 0.85)',
    zIndex: 100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    background: COLORS.bg,
    border: `1px solid ${COLORS.border}`,
    width: '100%',
    maxWidth: 480,
    fontFamily: '"JetBrains Mono", "Fira Code", "Courier New", monospace',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: COLORS.fg,
    color: COLORS.bg,
    padding: '8px 14px',
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.06em',
  },
  modalClose: {
    background: 'transparent',
    color: COLORS.bg,
    border: 'none',
    fontWeight: 700,
    fontSize: 12,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  modalBody: {
    padding: '16px 18px',
  },
  modalLine: {
    fontSize: 11,
    color: COLORS.fg,
    lineHeight: 1.7,
  },
  modalLabel: {
    fontSize: 10,
    color: COLORS.fgDim,
    marginBottom: 6,
  },
  presetGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 6,
    marginTop: 14,
  },
  presetBtn: {
    background: 'transparent',
    color: COLORS.fg,
    border: `1px solid ${COLORS.border}`,
    padding: '8px 8px',
    fontSize: 10,
    fontFamily: 'inherit',
    fontWeight: 700,
    letterSpacing: '0.04em',
    cursor: 'pointer',
  },
  presetBtnActive: {
    background: COLORS.fg,
    color: COLORS.bg,
  },
  select: {
    background: COLORS.bg,
    color: COLORS.fg,
    border: `1px solid ${COLORS.border}`,
    padding: '8px 10px',
    fontSize: 12,
    fontFamily: 'inherit',
    outline: 'none',
    cursor: 'pointer',
  },
  input: {
    width: '100%',
    background: 'transparent',
    color: COLORS.fg,
    border: `1px solid ${COLORS.border}`,
    padding: '8px 10px',
    fontSize: 12,
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
  },
};