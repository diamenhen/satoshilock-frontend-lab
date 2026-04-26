// app/config/contract-v2.js
// ────────────────────────────────────────
// SatoshiLockV2 ABI + helper constants.
//
// Keep this file ALONGSIDE the existing contract.js (v1).
// Both versions can coexist — the UI picks the active one per-network.
// ────────────────────────────────────────

// Sentinel address used in the `token` field to mark native ETH locks.
export const ETH_SENTINEL = '0x0000000000000000000000000000000000000000';

/**
 * Returns true if the given address is the ETH sentinel.
 */
export function isEthLock(tokenAddress) {
  if (!tokenAddress) return false;
  return tokenAddress.toLowerCase() === ETH_SENTINEL;
}

// ─── Authorization flag constants ───
export const AUTH = {
  NONE:      0,
  CREATOR:   1,
  RECIPIENT: 2,
  BOTH:      3,
};

// ═══════════ SatoshiLockV2 ABI ═══════════
export const SATOSHILOCK_V2_ABI = [
  // ─── CREATE ───
  {
    type: 'function', name: 'createLock', stateMutability: 'nonpayable',
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
  },
  {
    type: 'function', name: 'createLockETH', stateMutability: 'payable',
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
  },

  // ─── CLAIM / CANCEL / UPDATE ───
  { type: 'function', name: 'claim',            stateMutability: 'nonpayable',
    inputs: [{ name: 'lockId', type: 'bytes32' }], outputs: [] },
  { type: 'function', name: 'cancel',           stateMutability: 'nonpayable',
    inputs: [{ name: 'lockId', type: 'bytes32' }], outputs: [] },
  { type: 'function', name: 'updateRecipient',  stateMutability: 'nonpayable',
    inputs: [
      { name: 'lockId',       type: 'bytes32' },
      { name: 'newRecipient', type: 'address' },
    ], outputs: [] },

  // ─── VIEWS ───
  {
    type: 'function', name: 'getLock', stateMutability: 'view',
    inputs: [{ name: 'lockId', type: 'bytes32' }],
    outputs: [{
      type: 'tuple', name: '',
      components: [
        { name: 'creator',         type: 'address' },
        { name: 'recipient',       type: 'address' },
        { name: 'token',           type: 'address' },
        { name: 'totalAmount',     type: 'uint256' },
        { name: 'withdrawnAmount', type: 'uint256' },
        { name: 'startTime',       type: 'uint256' },
        { name: 'endTime',         type: 'uint256' },
        { name: 'cliffTime',       type: 'uint256' },
        { name: 'cliffAmount',     type: 'uint256' },
        { name: 'freqSecs',        type: 'uint256' },
        { name: 'cancelAuth',      type: 'uint8'   },
        { name: 'updateAuth',      type: 'uint8'   },
        { name: 'nonce',           type: 'uint256' },
      ],
    }],
  },
  {
    type: 'function', name: 'getLocksByCreator', stateMutability: 'view',
    inputs:  [{ name: 'creator', type: 'address' }],
    outputs: [{ name: '', type: 'bytes32[]' }],
  },
  {
    type: 'function', name: 'getLocksByRecipient', stateMutability: 'view',
    inputs:  [{ name: 'recipient', type: 'address' }],
    outputs: [{ name: '', type: 'bytes32[]' }],
  },
  {
    type: 'function', name: 'vestedAmount', stateMutability: 'view',
    inputs:  [{ name: 'lockId', type: 'bytes32' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function', name: 'claimable', stateMutability: 'view',
    inputs:  [{ name: 'lockId', type: 'bytes32' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function', name: 'totalLocks', stateMutability: 'view',
    inputs: [], outputs: [{ name: '', type: 'uint256' }],
  },

  // ─── EVENTS ───
  {
    type: 'event', name: 'LockCreated', anonymous: false,
    inputs: [
      { indexed: true,  name: 'lockId',          type: 'bytes32' },
      { indexed: true,  name: 'creator',         type: 'address' },
      { indexed: true,  name: 'recipient',       type: 'address' },
      { indexed: false, name: 'token',           type: 'address' },
      { indexed: false, name: 'actualAmount',    type: 'uint256' },
      { indexed: false, name: 'requestedAmount', type: 'uint256' },
      { indexed: false, name: 'startTime',       type: 'uint256' },
      { indexed: false, name: 'endTime',         type: 'uint256' },
    ],
  },
  {
    type: 'event', name: 'Claimed', anonymous: false,
    inputs: [
      { indexed: true,  name: 'lockId',    type: 'bytes32' },
      { indexed: true,  name: 'recipient', type: 'address' },
      { indexed: false, name: 'amount',    type: 'uint256' },
    ],
  },
  {
    type: 'event', name: 'LockCancelled', anonymous: false,
    inputs: [
      { indexed: true,  name: 'lockId',             type: 'bytes32' },
      { indexed: true,  name: 'by',                 type: 'address' },
      { indexed: false, name: 'vestedToRecipient',  type: 'uint256' },
      { indexed: false, name: 'refundedToCreator',  type: 'uint256' },
    ],
  },
  {
    type: 'event', name: 'RecipientUpdated', anonymous: false,
    inputs: [
      { indexed: true,  name: 'lockId',       type: 'bytes32' },
      { indexed: true,  name: 'oldRecipient', type: 'address' },
      { indexed: true,  name: 'newRecipient', type: 'address' },
    ],
  },
];

// ─── ERC-20 ABI ───
export const ERC20_ABI = [
  { type: 'function', name: 'name',     stateMutability: 'view',
    inputs: [], outputs: [{ name: '', type: 'string' }] },
  { type: 'function', name: 'symbol',   stateMutability: 'view',
    inputs: [], outputs: [{ name: '', type: 'string' }] },
  { type: 'function', name: 'decimals', stateMutability: 'view',
    inputs: [], outputs: [{ name: '', type: 'uint8'  }] },
  { type: 'function', name: 'balanceOf', stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', name: 'allowance', stateMutability: 'view',
    inputs: [
      { name: 'owner',   type: 'address' },
      { name: 'spender', type: 'address' },
    ], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', name: 'approve', stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount',  type: 'uint256' },
    ], outputs: [{ name: '', type: 'bool' }] },

  // ═════ V3 EXTENSIONS (lab) ═════
  {
    inputs: [
      { name: 'lockId', type: 'bytes32' },
      { name: 'newEndTime', type: 'uint256' },
    ],
    name: 'extendLock',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'lockId', type: 'bytes32' },
      { name: 'additionalAmount', type: 'uint256' },
    ],
    name: 'topUpLock',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'lockId', type: 'bytes32' },
    ],
    name: 'topUpLockETH',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true,  name: 'lockId',     type: 'bytes32' },
      { indexed: false, name: 'oldEndTime', type: 'uint256' },
      { indexed: false, name: 'newEndTime', type: 'uint256' },
    ],
    name: 'LockExtended',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true,  name: 'lockId',          type: 'bytes32' },
      { indexed: true,  name: 'creator',         type: 'address' },
      { indexed: false, name: 'requestedAmount', type: 'uint256' },
      { indexed: false, name: 'actualAmount',    type: 'uint256' },
      { indexed: false, name: 'newTotal',        type: 'uint256' },
    ],
    name: 'LockToppedUp',
    type: 'event',
  }
];
