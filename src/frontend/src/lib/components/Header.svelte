<script lang="ts">
  import { user, isAuthenticated } from '$lib/stores';
  import { walletService } from '$lib/services/wallet';
  import { login } from '$lib/api/user';

  let connecting = false;

  async function connectWallet() {
    connecting = true;
    try {
      const address = await walletService.connect();
      const userData = await login(address);
      user.login(userData);
    } catch (err) {
      console.error('Connection failed:', err);
    } finally {
      connecting = false;
    }
  }

  function disconnect() {
    walletService.disconnect();
    user.logout();
  }

  function truncateAddress(address: string): string {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }
</script>

<header class="bg-slate-800 border-b border-slate-700 sticky top-0 z-50">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="flex justify-between items-center h-16">
      <!-- Logo -->
      <a href="/" class="flex items-center space-x-2">
        <span class="text-2xl">🤖</span>
        <span class="text-xl font-bold text-white">Agent Labor</span>
      </a>

      <!-- Navigation -->
      <nav class="hidden md:flex items-center space-x-6">
        <a href="/dashboard" class="text-slate-300 hover:text-white transition">Dashboard</a>
        <a href="/jobs" class="text-slate-300 hover:text-white transition">Browse Jobs</a>
        <a href="/post-job" class="text-slate-300 hover:text-white transition">Post Job</a>
      </nav>

      <!-- Auth -->
      <div class="flex items-center space-x-4">
        {#if $isAuthenticated && $user}
          <a href="/profile/{$user.address}" class="flex items-center space-x-2 text-slate-300 hover:text-white">
            {#if $user.avatar}
              <img src={$user.avatar} alt="Avatar" class="w-8 h-8 rounded-full" />
            {:else}
              <div class="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center">
                <span class="text-sm font-bold">{$user.username.charAt(0).toUpperCase()}</span>
              </div>
            {/if}
            <span class="hidden sm:inline">{$user.username}</span>
          </a>
          <button on:click={disconnect} class="btn btn-secondary text-sm">
            Disconnect
          </button>
        {:else}
          <button on:click={connectWallet} disabled={connecting} class="btn btn-primary">
            {#if connecting}
              Connecting...
            {:else}
              Connect Wallet
            {/if}
          </button>
        {/if}
      </div>
    </div>
  </div>
</header>
