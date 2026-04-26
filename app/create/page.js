'use client';
import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  useAccount, useChainId, usePublicClient, useWalletClient, useWriteContract, useWaitForTransactionReceipt, useBalance, useReadContract,
} from 'wagmi';
import { parseUnits, parseEther, formatUnits, isAddress, decodeEventLog } from 'viem';
import { SATOSHILOCK_V2_ABI, ERC20_ABI, ETH_SENTINEL, AUTH } from '../config/contract-v2';
import { getActiveLockAddress } from '../config/wagmi';

// Inline ABI fragments — bypasses any ABI parsing issues
const CREATE_LOCK_ETH_ABI = [{
  type: 'function',
  name: 'createLockETH',
  stateMutability: 'payable',
  inputs: [
    { name: 'recipient',   type: 'address' },
    { name: 'startTime',   type: 'uint256' },
    { name: 'endTime',     type: 'uint256' },
    { name: 'cliffTime',   type: 'uint256' },
    { name: 'cliffAmount', type: 'uint256' },
    { name: 'freqSecs',    type: 'uint256' },
    { name: 'cancelAuth',  type: 'uint8'   },
    { name: 'updateAuth',  type: 'uint8'   },
    { name: 'nonce',       type: 'uint256' },
  ],
  outputs: [{ name: 'lockId', type: 'bytes32' }],
}];

const CREATE_LOCK_ABI = [{
  type: 'function',
  name: 'createLock',
  stateMutability: 'nonpayable',
  inputs: [
    { name: 'token',       type: 'address' },
    { name: 'recipient',   type: 'address' },
    { name: 'amount',      type: 'uint256' },
    { name: 'startTime',   type: 'uint256' },
    { name: 'endTime',     type: 'uint256' },
    { name: 'cliffTime',   type: 'uint256' },
    { name: 'cliffAmount', type: 'uint256' },
    { name: 'freqSecs',    type: 'uint256' },
    { name: 'cancelAuth',  type: 'uint8'   },
    { name: 'updateAuth',  type: 'uint8'   },
    { name: 'nonce',       type: 'uint256' },
  ],
  outputs: [{ name: 'lockId', type: 'bytes32' }],
}];

const DUR_UNITS = [
  { label: 'MIN',    value: 60 },
  { label: 'HOUR',   value: 3600 },
  { label: 'DAY',    value: 86400 },
  { label: 'WEEK',   value: 604800 },
  { label: 'MONTH',  value: 2592000 },
  { label: 'YEAR',   value: 31536000 },
];

function getToday() { return new Date().toISOString().split('T')[0]; }
function getNowTime() { const d = new Date(); return d.toTimeString().slice(0, 5); }

function friendlyError(err) {
  const msg = err?.shortMessage || err?.message || String(err);
  if (msg.includes('User rejected')) return 'TX_REJECTED_BY_USER';
  if (msg.includes('insufficient')) return 'INSUFFICIENT_FUNDS';
  return msg.slice(0, 120);
}

export default function CreatePage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const contractAddress = getActiveLockAddress(chainId);

  // Form state
  const [tokenAddr, setTokenAddr] = useState('');
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [cliffDate, setCliffDate] = useState(getToday());
  const [cliffTime, setCliffTime] = useState(getNowTime());
  const [cliffAmount, setCliffAmount] = useState('0');
  const [durValue, setDurValue] = useState('1');
  const [durUnit, setDurUnit] = useState(2592000);
  // freq removed - defaults to duration (1 step)
  const [cancelAuth, setCancelAuth] = useState(AUTH.CREATOR);
  const [updateAuth, setUpdateAuth] = useState(AUTH.CREATOR);

  const [isNative, setIsNative] = useState(true);
  const [tokenSymbol, setTokenSymbol] = useState('ETH');
  const [tokenDecimals, setTokenDecimals] = useState(18);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingTx, setPendingTx] = useState(null);
  const [recipientHistory, setRecipientHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('lab_recipient_history') || '[]');
      setRecipientHistory(saved);
    } catch {}
  }, []);

  function saveRecipient(addr) {
    try {
      const list = JSON.parse(localStorage.getItem('lab_recipient_history') || '[]');
      const filtered = list.filter(a => a.toLowerCase() !== addr.toLowerCase());
      filtered.unshift(addr);
      const trimmed = filtered.slice(0, 8);
      localStorage.setItem('lab_recipient_history', JSON.stringify(trimmed));
      setRecipientHistory(trimmed);
    } catch {}
  }

  // Native ETH balance
  const { data: nativeBalance } = useBalance({ address });

  // ERC-20 balance (only fetched when token is set + valid)
  const { data: erc20Balance } = useReadContract({
    address: tokenAddr,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address],
    query: { enabled: !!address && !!tokenAddr && isAddress(tokenAddr) },
  });

  // Auto-detect native vs ERC-20
  useEffect(() => {
    if (!tokenAddr || tokenAddr === ETH_SENTINEL || tokenAddr.toLowerCase() === '0x0000000000000000000000000000000000000000') {
      setIsNative(true);
      setTokenSymbol('ETH');
      setTokenDecimals(18);
      return;
    }
    if (!isAddress(tokenAddr) || !publicClient) return;

    setIsNative(false);
    (async () => {
      try {
        const [sym, dec] = await Promise.all([
          publicClient.readContract({ address: tokenAddr, abi: ERC20_ABI, functionName: 'symbol' }),
          publicClient.readContract({ address: tokenAddr, abi: ERC20_ABI, functionName: 'decimals' }),
        ]);
        setTokenSymbol(sym);
        setTokenDecimals(Number(dec));
      } catch (e) {
        setTokenSymbol('TOKEN');
        setTokenDecimals(18);
      }
    })();
  }, [tokenAddr, publicClient]);

  const cliffTs = useMemo(() => {
    if (!cliffDate) return 0;
    return Math.floor(new Date(`${cliffDate}T${cliffTime || '00:00'}:00`).getTime() / 1000);
  }, [cliffDate, cliffTime]);

  const durSecs = useMemo(() => Math.floor((parseFloat(durValue) || 0) * durUnit), [durValue, durUnit]);
  const freqSecs = durSecs; // 1 step = full duration
  const endTs = cliffTs ? cliffTs + durSecs : 0;

  const canSubmit = isConnected && contractAddress && amount && parseFloat(amount) > 0
    && recipient && isAddress(recipient) && cliffTs > 0 && durSecs >= 60 && freqSecs >= 60;

  async function handleSubmit() {
    setError('');
    if (!canSubmit || !walletClient || !publicClient) return;
    setLoading(true);

    try {
      const nowSec = Math.floor(Date.now() / 1000);
      const safeCliffTs = cliffTs > nowSec + 30 ? cliffTs : nowSec + 60;
      const safeEndTs = safeCliffTs + durSecs;

      const totalAmount = isNative
        ? parseEther(amount)
        : parseUnits(amount, tokenDecimals);
      const cliffAmt = isNative
        ? parseEther(cliffAmount || '0')
        : parseUnits(cliffAmount || '0', tokenDecimals);

      const nonce = BigInt(Date.now());

      if (isNative) {
        const hash = await walletClient.writeContract({
          address: contractAddress,
          abi: CREATE_LOCK_ETH_ABI,
          functionName: 'createLockETH',
          args: [
            recipient,
            BigInt(safeCliffTs),
            BigInt(safeEndTs),
            BigInt(safeCliffTs),
            cliffAmt,
            BigInt(freqSecs),
            cancelAuth,
            updateAuth,
            nonce,
          ],
          value: totalAmount,
          account: address,
        });
        setPendingTx(hash);
      } else {
        // 1. Approve
        const approveHash = await walletClient.writeContract({
          address: tokenAddr,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [contractAddress, totalAmount],
          account: address,
        });
        await publicClient.waitForTransactionReceipt({ hash: approveHash });

        // 2. createLock
        const hash = await walletClient.writeContract({
          address: contractAddress,
          abi: CREATE_LOCK_ABI,
          functionName: 'createLock',
          args: [
            tokenAddr, recipient, totalAmount,
            BigInt(safeCliffTs), BigInt(safeEndTs), BigInt(safeCliffTs),
            cliffAmt,
            BigInt(freqSecs),
            cancelAuth, updateAuth,
            nonce,
          ],
          account: address,
        });
        setPendingTx(hash);
      }
    } catch (e) {
      setError(friendlyError(e));
      setLoading(false);
    }
  }

  // Wait for tx receipt
  const { data: receipt, isSuccess: txConfirmed } = useWaitForTransactionReceipt({
    hash: pendingTx,
    query: { enabled: !!pendingTx },
  });

  useEffect(() => {
    if (txConfirmed && receipt) {
      setLoading(false);
      saveRecipient(recipient);
      router.push('/locks?tab=created');
    }
  }, [txConfirmed, receipt, router]);

  return (
    <div style={S.page}>
      <div style={S.cmdLine}>{'>'} CMD: ./create_lock.sh</div>

      {/* SECTION 01 — TOKEN */}
      <Section num="01" title="TOKEN">
        <Label>Token contract (empty = native ETH):</Label>
        <input style={S.input} placeholder="0x..." value={tokenAddr}
          onChange={e => setTokenAddr(e.target.value)} />
        <div style={S.hint}>
          {isNative ? '> Type: NATIVE_ETH' : `> Type: ERC-20 // Symbol: ${tokenSymbol} // Decimals: ${tokenDecimals}`}
        </div>
      </Section>

      {/* SECTION 02 — AMOUNT */}
      <Section num="02" title="AMOUNT">
        <div style={S.balanceRow}>
          <Label>Total lock amount:</Label>
          <div style={S.balanceHint}>
            {'>'} available: {
              isNative
                ? (nativeBalance ? `${parseFloat(nativeBalance.formatted).toFixed(4)} ${nativeBalance.symbol}` : '...')
                : (erc20Balance !== undefined ? `${parseFloat(formatUnits(erc20Balance, tokenDecimals)).toFixed(4)} ${tokenSymbol}` : '...')
            }
            <button type="button" style={S.maxBtn} onClick={() => {
              if (isNative && nativeBalance) {
                // Leave 0.005 ETH for gas
                const max = Math.max(0, parseFloat(nativeBalance.formatted) - 0.005);
                setAmount(max.toFixed(6));
              } else if (!isNative && erc20Balance !== undefined) {
                setAmount(formatUnits(erc20Balance, tokenDecimals));
              }
            }}>[MAX]</button>
          </div>
        </div>
        <div style={S.inputRow}>
          <input style={{...S.input, flex: 1}} type="number" min="0" placeholder="0.000"
            value={amount} onChange={e => setAmount(e.target.value)} />
          <div style={S.suffix}>[{tokenSymbol}]</div>
        </div>
      </Section>

      {/* SECTION 03 — RECIPIENT */}
      <Section num="03" title="RECIPIENT">
        <Label>Recipient wallet:</Label>
        <div style={{position: 'relative'}}>
          <div style={S.inputRow}>
            <input style={{...S.input, flex: 1}} placeholder="0x..." value={recipient}
              onChange={e => setRecipient(e.target.value)}
              onFocus={() => setShowHistory(true)}
              onBlur={() => setTimeout(() => setShowHistory(false), 200)} />
            {recipientHistory.length > 0 && (
              <button type="button" style={S.historyBtn}
                onMouseDown={e => { e.preventDefault(); setShowHistory(s => !s); }}>
                [HIST]
              </button>
            )}
          </div>
          {showHistory && recipientHistory.length > 0 && (
            <div style={S.historyDropdown}>
              {recipientHistory.map((addr, i) => (
                <div key={i} style={S.historyItem}
                  onMouseDown={e => {
                    e.preventDefault();
                    setRecipient(addr);
                    setShowHistory(false);
                  }}>
                  <span style={{color: '#00ff88', fontSize: 11}}>[{i+1}]</span>
                  <span style={{flex: 1, fontSize: 11}}>{addr.slice(0,10)}...{addr.slice(-8)}</span>
                  <button type="button" style={S.historyRemove}
                    onMouseDown={e => {
                      e.preventDefault();
                      e.stopPropagation();
                      const filtered = recipientHistory.filter(a => a !== addr);
                      localStorage.setItem('lab_recipient_history', JSON.stringify(filtered));
                      setRecipientHistory(filtered);
                    }}>[X]</button>
                </div>
              ))}
            </div>
          )}
        </div>
        {recipient && !isAddress(recipient) && (
          <div style={S.errText}>! INVALID_ADDRESS</div>
        )}
      </Section>

      {/* SECTION 04 — SCHEDULE */}
      <Section num="04" title="SCHEDULE">
        <div style={S.gridTwo}>
          <div>
            <Label>Cliff date:</Label>
            <input style={S.input} type="date" value={cliffDate}
              onChange={e => setCliffDate(e.target.value)} />
          </div>
          <div>
            <Label>Cliff time:</Label>
            <input style={S.input} type="time" value={cliffTime}
              onChange={e => setCliffTime(e.target.value)} />
          </div>
        </div>
        <Label>Cliff amount (vested at cliff):</Label>
        <div style={S.inputRow}>
          <input style={{...S.input, flex: 1}} type="number" min="0" placeholder="0"
            value={cliffAmount} onChange={e => setCliffAmount(e.target.value)} />
          <div style={S.suffix}>[{tokenSymbol}]</div>
        </div>

        <div style={S.gridTwo}>
          <div>
            <Label>Duration:</Label>
            <div style={S.inputRow}>
              <input style={{...S.input, flex: 1}} type="number" min="0" value={durValue}
                onChange={e => setDurValue(e.target.value)} />
              <select style={S.select} value={durUnit}
                onChange={e => setDurUnit(Number(e.target.value))}>
                {DUR_UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
            </div>
          </div>

        </div>
      </Section>

      {/* SECTION 05 — AUTH */}
      <Section num="05" title="AUTH">
        <div style={S.gridTwo}>
          <div>
            <Label>Cancel auth:</Label>
            <select style={S.select} value={cancelAuth}
              onChange={e => setCancelAuth(Number(e.target.value))}>
              <option value={AUTH.NONE}>NONE</option>
              <option value={AUTH.CREATOR}>CREATOR</option>
              <option value={AUTH.RECIPIENT}>RECIPIENT</option>
              <option value={AUTH.BOTH}>BOTH</option>
            </select>
          </div>
          <div>
            <Label>Update auth:</Label>
            <select style={S.select} value={updateAuth}
              onChange={e => setUpdateAuth(Number(e.target.value))}>
              <option value={AUTH.NONE}>NONE</option>
              <option value={AUTH.CREATOR}>CREATOR</option>
              <option value={AUTH.RECIPIENT}>RECIPIENT</option>
              <option value={AUTH.BOTH}>BOTH</option>
            </select>
          </div>
        </div>
      </Section>

      {/* SUBMIT */}
      <div style={S.submitRow}>
        {error && <div style={S.errBox}>! ERROR: {error}</div>}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || loading}
          style={{...S.submitBtn, ...((!canSubmit || loading) ? S.submitDisabled : {})}}>
          {loading ? '[ EXECUTING... ]' : '[ EXECUTE.LOCK ]'}
        </button>
        <div style={S.gasHint}>// gas est: ~0.005 ETH</div>
      </div>
    </div>
  );
}

function Section({ num, title, children }) {
  return (
    <section style={S.section}>
      <div style={S.sectionHeader}>[{num}] {title}</div>
      <div style={S.sectionBody}>{children}</div>
    </section>
  );
}

function Label({ children }) {
  return <div style={S.label}>{'>'} {children}</div>;
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
    maxWidth: 720,
    margin: '0 auto',
    minHeight: 'calc(100vh - 100px)',
  },
  cmdLine: {
    fontSize: 11,
    color: COLORS.fgDim,
    letterSpacing: '0.05em',
    marginBottom: 16,
  },
  section: {
    border: `1px solid ${COLORS.border}`,
    marginBottom: 14,
  },
  sectionHeader: {
    background: COLORS.fg,
    color: COLORS.bg,
    padding: '6px 14px',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.06em',
  },
  sectionBody: {
    padding: '14px 18px',
  },
  label: {
    fontSize: 10,
    color: COLORS.fgDim,
    letterSpacing: '0.04em',
    marginBottom: 6,
    marginTop: 10,
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
  inputRow: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
  },
  suffix: {
    fontSize: 11,
    color: COLORS.fgDim,
    minWidth: 60,
    textAlign: 'left',
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
  gridTwo: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
  },
  hint: {
    fontSize: 10,
    color: COLORS.fgDim,
    marginTop: 6,
  },
  errText: {
    fontSize: 10,
    color: COLORS.err,
    marginTop: 6,
  },
  errBox: {
    fontSize: 11,
    color: COLORS.err,
    border: `1px solid ${COLORS.err}`,
    padding: '8px 12px',
    marginBottom: 12,
  },
  submitRow: {
    marginTop: 20,
  },
  submitBtn: {
    background: COLORS.fg,
    color: COLORS.bg,
    border: 'none',
    padding: '10px 22px',
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: '0.06em',
    fontFamily: 'inherit',
    cursor: 'pointer',
    width: '100%',
  },
  submitDisabled: {
    background: '#333',
    color: '#666',
    cursor: 'not-allowed',
  },
  gasHint: {
    fontSize: 10,
    color: COLORS.fgMute,
    marginTop: 8,
    textAlign: 'right',
  },
  balanceRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  balanceHint: {
    fontSize: 10,
    color: COLORS.fgDim,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  maxBtn: {
    background: 'transparent',
    border: `1px solid ${COLORS.border}`,
    color: COLORS.fg,
    padding: '2px 8px',
    fontSize: 9,
    fontWeight: 700,
    fontFamily: 'inherit',
    cursor: 'pointer',
    letterSpacing: '0.04em',
  },
  historyBtn: {
    background: 'transparent',
    border: `1px solid ${COLORS.border}`,
    color: COLORS.fg,
    padding: '6px 10px',
    fontSize: 10,
    fontWeight: 700,
    fontFamily: 'inherit',
    cursor: 'pointer',
    letterSpacing: '0.04em',
    flexShrink: 0,
  },
  historyDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    background: COLORS.bg,
    border: `1px solid ${COLORS.border}`,
    marginTop: 4,
    zIndex: 10,
    maxHeight: 240,
    overflowY: 'auto',
  },
  historyItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 10px',
    fontFamily: 'inherit',
    color: COLORS.fg,
    cursor: 'pointer',
    borderBottom: `1px dashed ${COLORS.fgMute}`,
  },
  historyRemove: {
    background: 'transparent',
    border: 'none',
    color: COLORS.err,
    fontSize: 10,
    fontWeight: 700,
    fontFamily: 'inherit',
    cursor: 'pointer',
    padding: 2,
  },
};