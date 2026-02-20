// Type declarations for MetaMask / EIP-1193 provider injected into window

interface EthereumProvider {
    isMetaMask?: boolean;
    request(args: { method: string; params?: unknown[] }): Promise<unknown>;
    on(event: string, handler: (...args: unknown[]) => void): void;
    removeListener(event: string, handler: (...args: unknown[]) => void): void;
}

declare global {
    interface Window {
        ethereum?: EthereumProvider;
    }
}

export { };
