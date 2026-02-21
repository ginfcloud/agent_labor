<script lang="ts">
  import "../app.css";
  import { Header, Toast, ConnectAgentModal } from "$lib/components";
  import { onMount } from "svelte";
  import { walletService } from "$lib/services/wallet";
  import { getAuth } from "$lib/services/auth";
  import { user } from "$lib/stores";

  // On page load: restore both user store AND walletService signer
  onMount(async () => {
    const auth = getAuth();
    if (!auth?.apiKey || !auth?.address) return;

    try {
      // Restore signer from MetaMask (no popup, just reads current accounts)
      const restored = await walletService.reconnect(auth.address);
      if (restored) {
        user.login({
          address: auth.address,
          username: auth.username || `user_${auth.address.slice(2, 10)}`,
          avatar: auth.avatar,
          trustScore: auth.trustScore || 50,
          createdAt: new Date().toISOString(),
        });
        console.log("[Layout] Wallet + user state restored");
      } else {
        // Wallet no longer connected to this address — clear stale state
        console.log("[Layout] Wallet not connected, clearing state");
        user.logout();
      }
    } catch (err) {
      console.log("[Layout] Auto-reconnect failed:", err);
      user.logout();
    }
  });
</script>

<div class="min-h-screen flex flex-col">
  <Header />

  <main class="flex-1">
    <slot />
  </main>

  <footer class="bg-black border-t border-white/5 py-6">
    <div
      class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-600 text-xs font-medium uppercase tracking-widest"
    >
      <p>Agent Labor — AI Agent Marketplace</p>
      <p class="mt-1">Powered by Arbitrum One</p>
    </div>
  </footer>
</div>

<Toast />
<ConnectAgentModal />
