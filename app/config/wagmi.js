import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet, sepolia, base, baseSepolia, bsc, bscTestnet } from 'wagmi/chains';
import { http } from 'wagmi';

const WALLETCONNECT_PROJECT_ID = '456990ffb7fae70da633622634ac3311';

export const config = getDefaultConfig({
  appName: 'SatoshiLock',
  projectId: WALLETCONNECT_PROJECT_ID,
  chains: [mainnet, sepolia, base, baseSepolia, bsc, bscTestnet],
  transports: {
    [mainnet.id]:     http('https://ethereum-rpc.publicnode.com'),
    [sepolia.id]:     http('https://ethereum-sepolia-rpc.publicnode.com'),
    [base.id]:        http('https://base-rpc.publicnode.com'),
    [baseSepolia.id]: http('https://base-sepolia-rpc.publicnode.com'),
    [bsc.id]:         http('https://bsc-rpc.publicnode.com'),
    [bscTestnet.id]:  http('https://bsc-testnet-rpc.publicnode.com'),
  },
  ssr: true,
});

export const wagmiConfig = config;

const ADDRESSES = {
  [mainnet.id]: {
    v1: '0xbD1d35b574361632EC2cc1376dCD346741997474',
    v2: '0xD40Febe77b4a9bdE56e13cf4067638b98A061925',
    v3: '0xf8cBE46f0619471fAf313aed509FC0d0c8fC3683',
  },
  [sepolia.id]: {
    v1: '0x8ACE760705E031ebdD37D4008288Ffbf3645eA8c',
    v2: '0x77bA36967bAFf6Bc4f71805D27d94c82dFe44D06',
    v3: '0x075d746Fd069E2BEa829DeDd13D985ed27a62C95', // SatoshiLock V3 Lab — Sepolia
  },
  [base.id]: {
    v1: null,
    v2: '0xbD1d35b574361632EC2cc1376dCD346741997474',
    v3: null,
  },
  [baseSepolia.id]: {
    v1: null,
    v2: '0xD40Febe77b4a9bdE56e13cf4067638b98A061925',
    v3: null,
  },
  [bsc.id]: {
    v1: null,
    v2: '0xbD1d35b574361632EC2cc1376dCD346741997474',
    v3: null,
  },
  [bscTestnet.id]: {
    v1: null,
    v2: '0xbD1d35b574361632EC2cc1376dCD346741997474',
    v3: null,
  },
};

export function getSatoshiLockAddress(chainId) {
  return ADDRESSES[chainId]?.v1 || null;
}

export function getSatoshiLockV2Address(chainId) {
  const addr = ADDRESSES[chainId]?.v2;
  if (!addr || addr === '0x0000000000000000000000000000000000000000') return null;
  return addr;
}

export function getSatoshiLockV3Address(chainId) {
  const addr = ADDRESSES[chainId]?.v3;
  if (!addr || addr === '0x0000000000000000000000000000000000000000') return null;
  return addr;
}

export function getActiveLockAddress(chainId) {
  return getSatoshiLockV3Address(chainId) || getSatoshiLockV2Address(chainId) || getSatoshiLockAddress(chainId);
}

export function getActiveLockVersion(chainId) {
  if (getSatoshiLockV3Address(chainId)) return 'v3';
  if (getSatoshiLockV2Address(chainId)) return 'v2';
  return 'v1';
}

export function getAllLockAddresses(chainId) {
  const v1 = getSatoshiLockAddress(chainId);
  const v2 = getSatoshiLockV2Address(chainId);
  const v3 = getSatoshiLockV3Address(chainId);
  const out = [];
  if (v1) out.push({ version: 'v1', address: v1 });
  if (v2) out.push({ version: 'v2', address: v2 });
  if (v3) out.push({ version: 'v3', address: v3 });
  return out;
}

export function isChainSupported(chainId) {
  return getActiveLockAddress(chainId) !== null;
}