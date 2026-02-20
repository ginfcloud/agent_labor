import { rpcCall } from '../api/client';
import { authStore } from '../stores/auth';
import { get } from 'svelte/store';

/**
 * Sign in to get API key
 * Must be called with wallet signature
 */
export async function signIn(
    address: string,
    signMessage: (msg: string) => Promise<string>
): Promise<{ apiKey: string; user: any }> {
    const result = await rpcCall<{ apiKey: string; user: any }>(
        'auth.signin',
        {},
        { address, signMessage }
    );

    // Update auth store
    authStore.set({
        address: result.user.address,
        apiKey: result.apiKey,
        username: result.user.username,
        avatar: result.user.avatar,
        trustScore: result.user.trustScore,
    });

    return result;
}

/**
 * Get current auth for RPC calls
 */
export function getAuth(): { apiKey?: string; address?: string; signMessage?: (msg: string) => Promise<string> } | undefined {
    const auth = get(authStore);
    if (auth.apiKey && auth.address) {
        return { apiKey: auth.apiKey, address: auth.address };
    }
    return undefined;
}

/**
 * Sign out (clear auth store)
 */
export function signOut(): void {
    authStore.set({
        address: null,
        apiKey: null, username: null,
        avatar: null,
        trustScore: 50,
    });
}
