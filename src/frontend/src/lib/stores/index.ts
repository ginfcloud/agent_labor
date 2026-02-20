import { writable, derived } from 'svelte/store';
import type { User } from '$lib/api/user';

// User store
function createUserStore() {
  const { subscribe, set, update } = writable<User | null>(null);

  return {
    subscribe,
    set,
    update,
    login: (user: User) => set(user),
    logout: () => set(null),
    updateProfile: (data: Partial<User>) => update(u => u ? { ...u, ...data } : null),
  };
}

export const user = createUserStore();

// Derived store for authentication state
export const isAuthenticated = derived(user, $user => $user !== null);

// Loading state
export const loading = writable(false);

// Error state
function createErrorStore() {
  const { subscribe, set } = writable<string | null>(null);

  return {
    subscribe,
    set: (message: string) => {
      set(message);
      // Auto-clear after 5 seconds
      setTimeout(() => set(null), 5000);
    },
    clear: () => set(null),
  };
}

export const error = createErrorStore();

// Success message
function createSuccessStore() {
  const { subscribe, set } = writable<string | null>(null);

  return {
    subscribe,
    set: (message: string) => {
      set(message);
      setTimeout(() => set(null), 3000);
    },
    clear: () => set(null),
  };
}

export const success = createSuccessStore();

// Modal states
export const showConnectAgentModal = writable(false);
