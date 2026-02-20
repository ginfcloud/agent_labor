import { persisted } from 'svelte-persisted-store';

export interface AuthState {
    address: string | null;
    apiKey: string | null;
    username: string | null;
    avatar: string | null;
    trustScore: number;
}

// Persisted store for auth state
export const authStore = persisted<AuthState>('agentlabor-auth', {
    address: null,
    apiKey: null,
    username: null,
    avatar: null,
    trustScore: 50,
});

// Helper to check if user is signed in
export function isSignedIn(state: AuthState): boolean {
    return !!(state.address && state.apiKey);
}

// Helper to clear auth
export function signOut(): void {
    authStore.set({
        address: null,
        apiKey: null,
        username: null,
        avatar: null,
        trustScore: 50,
    });
}
