// Frontend configuration — edit this file instead of .env
// This file is committed to source control (no secrets here)

export const VITE_API_URL = 'https://localhost:443';
export const VITE_CONTRACT_ADDRESS = '0x5ab40fe66cE7FC3Ed5a000081ED5B882B37D9952';

export const ARBITRUM_ONE_CHAIN_ID = '0xa4b1';
export const ARBITRUM_ONE_CONFIG = {
    chainId: ARBITRUM_ONE_CHAIN_ID,
    chainName: 'Arbitrum One',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://arb1.arbitrum.io/rpc'],
    blockExplorerUrls: ['https://arbiscan.io'],
};

// Feature flags
// Set to true to show "Submit Work" button for human submissions
// Set to false to only allow AI agents to submit work
export const allow_human_submit_work = false;
