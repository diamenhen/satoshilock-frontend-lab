// SatoshiLock contract ABI and helpers
// Only includes functions we actually call from the frontend.

export const SATOSHILOCK_ABI = [
  // createLock
  {
    inputs: [
      { internalType: 'address', name: 'recipient', type: 'address' },
      { internalType: 'address', name: 'token', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'uint256', name: 'startTime', type: 'uint256' },
      { internalType: 'uint256', name: 'endTime', type: 'uint256' },
      { internalType: 'uint256', name: 'cliffTime', type: 'uint256' },
      { internalType: 'uint256', name: 'cliffAmount', type: 'uint256' },
      { internalType: 'uint256', name: 'freqSecs', type: 'uint256' },
      { internalType: 'uint8', name: 'cancelAuth', type: 'uint8' },
      { internalType: 'uint8', name: 'updateAuth', type: 'uint8' },
      { internalType: 'uint256', name: 'nonce', type: 'uint256' },
    ],
    name: 'createLock',
    outputs: [{ internalType: 'bytes32', name: 'lockId', type: 'bytes32' }],
    stateMutability: 'payable',
    type: 'function',
  },
  // claim
  {
    inputs: [{ internalType: 'bytes32', name: 'lockId', type: 'bytes32' }],
    name: 'claim',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // getLock
  {
    inputs: [{ internalType: 'bytes32', name: 'lockId', type: 'bytes32' }],
    name: 'getLock',
    outputs: [
      {
        components: [
          { internalType: 'address', name: 'creator', type: 'address' },
          { internalType: 'address', name: 'recipient', type: 'address' },
          { internalType: 'address', name: 'token', type: 'address' },
          { internalType: 'uint256', name: 'amount', type: 'uint256' },
          { internalType: 'uint256', name: 'withdrawn', type: 'uint256' },
          { internalType: 'uint256', name: 'startTime', type: 'uint256' },
          { internalType: 'uint256', name: 'endTime', type: 'uint256' },
          { internalType: 'uint256', name: 'cliffTime', type: 'uint256' },
          { internalType: 'uint256', name: 'cliffAmount', type: 'uint256' },
          { internalType: 'uint256', name: 'freqSecs', type: 'uint256' },
          { internalType: 'uint8', name: 'cancelAuth', type: 'uint8' },
          { internalType: 'uint8', name: 'updateAuth', type: 'uint8' },
          { internalType: 'uint256', name: 'nonce', type: 'uint256' },
        ],
        internalType: 'struct SatoshiLock.Lock',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  // vestedAmount
  {
    inputs: [{ internalType: 'bytes32', name: 'lockId', type: 'bytes32' }],
    name: 'vestedAmount',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  // claimable
  {
    inputs: [{ internalType: 'bytes32', name: 'lockId', type: 'bytes32' }],
    name: 'claimable',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  // getLocksByCreator
  {
    inputs: [{ internalType: 'address', name: 'creator', type: 'address' }],
    name: 'getLocksByCreator',
    outputs: [{ internalType: 'bytes32[]', name: '', type: 'bytes32[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  // getLocksByRecipient
  {
    inputs: [{ internalType: 'address', name: 'recipient', type: 'address' }],
    name: 'getLocksByRecipient',
    outputs: [{ internalType: 'bytes32[]', name: '', type: 'bytes32[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  // totalLocks
  {
    inputs: [],
    name: 'totalLocks',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
];

// Standard ERC-20 ABI — minimal subset we need (allowance + approve + decimals + symbol + balanceOf)
export const ERC20_ABI = [
  {
    inputs: [{ internalType: 'address', name: 'owner', type: 'address' }, { internalType: 'address', name: 'spender', type: 'address' }],
    name: 'allowance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'spender', type: 'address' }, { internalType: 'uint256', name: 'amount', type: 'uint256' }],
    name: 'approve',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'name',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
];

// Common tokens per chain. User can paste any ERC-20 address — these are just defaults.
export const COMMON_TOKENS = {
  // Ethereum Mainnet
  1: [
    { address: '0x0000000000000000000000000000000000000000', symbol: 'ETH',  name: 'Ether (native)',    decimals: 18, isNative: true },
    { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', symbol: 'USDT', name: 'Tether',            decimals: 6 },
    { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', symbol: 'USDC', name: 'USD Coin',          decimals: 6 },
    { address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', symbol: 'DAI',  name: 'Dai',               decimals: 18 },
    { address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', symbol: 'WBTC', name: 'Wrapped BTC',       decimals: 8 },
  ],
  // Sepolia Testnet
  11155111: [
    { address: '0x0000000000000000000000000000000000000000', symbol: 'ETH',    name: 'Sepolia ETH (native)', decimals: 18, isNative: true },
    { address: '0xD40Febe77b4a9bdE56e13cf4067638b98A061925', symbol: 'SLTEST', name: 'SatoshiLock Test Token', decimals: 18 },
  ],
  // BSC Mainnet (chainId 56)
  56: [
    { address: '0x0000000000000000000000000000000000000000', symbol: 'BNB',  name: 'BNB (native)',      decimals: 18, isNative: true },
    { address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', symbol: 'WBNB', name: 'Wrapped BNB',       decimals: 18 },
    { address: '0x55d398326f99059fF775485246999027B3197955', symbol: 'USDT', name: 'Tether (BEP-20)',   decimals: 18 },
    { address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', symbol: 'USDC', name: 'USD Coin (BEP-20)', decimals: 18 },
    { address: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82', symbol: 'CAKE', name: 'PancakeSwap',       decimals: 18 },
    { address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', symbol: 'BUSD', name: 'BUSD (legacy)',     decimals: 18 },
  ],
  // BSC Testnet (chainId 97)
  97: [
    { address: '0x0000000000000000000000000000000000000000', symbol: 'tBNB', name: 'Testnet BNB (native)', decimals: 18, isNative: true },
    { address: '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd', symbol: 'WBNB', name: 'Wrapped tBNB',          decimals: 18 },
  ],
};

// Helper: format duration from seconds into human-readable label
export function formatDuration(secs) {
  if (!secs || secs <= 0) return '—';
  if (secs >= 31536000) return (secs / 31536000).toFixed(1) + ' yr';
  if (secs >= 2592000)  return Math.round(secs / 2592000) + ' mo';
  if (secs >= 604800)   return Math.round(secs / 604800) + ' wk';
  if (secs >= 86400)    return Math.round(secs / 86400) + ' d';
  if (secs >= 3600)     return Math.round(secs / 3600) + ' hr';
  if (secs >= 60)       return Math.round(secs / 60) + ' min';
  return secs + ' sec';
}

// Helper: format timestamp to short date string
export function formatDate(ts) {
  if (!ts) return '—';
  const d = new Date(ts * 1000);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ', ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

// Helper: format address (0x1234...abcd)
export function shortAddr(addr) {
  if (!addr) return '—';
  return addr.slice(0, 6) + '...' + addr.slice(-4);
}

// Helper: format number
export function numFmt(n, dec = 4) {
  return Number(n).toLocaleString('en-US', { maximumFractionDigits: dec });
}

// Duration unit options (matches Solana version)
export const DUR_UNITS = [
  { label: 'Minute', value: 60 },
  { label: 'Day',    value: 86400 },
  { label: 'Week',   value: 604800 },
  { label: 'Month',  value: 2592000 },
  { label: 'Year',   value: 31536000 },
];
