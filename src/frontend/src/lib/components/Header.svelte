<script lang="ts">
  import { user, isAuthenticated } from "$lib/stores";
  import { walletService } from "$lib/services/wallet";
  import { login } from "$lib/api/user";
  import { page } from "$app/stores";

  let connecting = false;
  let mobileMenuOpen = false;

  async function connectWallet() {
    connecting = true;
    try {
      const address = await walletService.connect();
      const userData = await login(address);
      user.login(userData);
    } catch (err) {
      console.error("Connection failed:", err);
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

  function isActive(path: string): boolean {
    return (
      $page.url.pathname === path || $page.url.pathname.startsWith(path + "/")
    );
  }

  function closeMobile() {
    mobileMenuOpen = false;
  }

  const navLinks = [
    { href: "/jobs", label: "Browse Jobs" },
    { href: "/post-job", label: "Post Job" },
    { href: "/leaderboard", label: "Leaderboard" },
  ];
</script>

<header
  class="w-full border-b border-white/5 bg-black/95 backdrop-blur-sm sticky top-0 z-50"
>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="flex justify-between items-center h-16">
      <!-- Logo -->
      <a href="/" class="flex items-center gap-2 flex-shrink-0">
        <img src="/logo.png" alt="Agent Labor" class="w-8 h-8" />
        <span class="font-black text-lg tracking-tighter text-white uppercase">
          Agent<span class="text-red-600">Labor</span>
        </span>
      </a>

      <!-- Desktop Navigation -->
      <nav class="hidden md:flex items-center gap-6">
        {#each navLinks as link}
          <a
            href={link.href}
            class="text-[11px] font-bold uppercase tracking-widest transition-colors {isActive(
              link.href,
            )
              ? 'text-red-500'
              : 'text-gray-400 hover:text-white'}"
          >
            {link.label}
          </a>
        {/each}
      </nav>

      <!-- Auth area (desktop) -->
      <div class="hidden md:flex items-center gap-3">
        {#if $isAuthenticated && $user}
          <!-- Profile link - animated/obvious -->
          <a
            href="/profile/{$user.address}"
            class="group flex items-center gap-2 border border-white/10 hover:border-red-600/50 bg-white/5 hover:bg-red-600/10 px-3 py-1.5 transition-all"
          >
            {#if $user.avatar}
              <img
                src={$user.avatar}
                alt="Avatar"
                class="w-5 h-5 rounded-full"
              />
            {:else}
              <div
                class="w-5 h-5 rounded-full bg-red-600 flex items-center justify-center flex-shrink-0"
              >
                <span class="text-[9px] font-black text-white"
                  >{$user.username.charAt(0).toUpperCase()}</span
                >
              </div>
            {/if}
            <div class="flex flex-col leading-none">
              <span
                class="text-[8px] font-bold text-gray-600 uppercase tracking-widest"
                >Profile</span
              >
              <span
                class="text-[11px] font-bold text-white group-hover:text-red-400 transition-colors truncate max-w-[120px]"
                >{$user.username}</span
              >
            </div>
            <svg
              class="w-3 h-3 text-gray-600 group-hover:text-red-500 transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </a>
          <button
            on:click={disconnect}
            class="text-[10px] font-bold text-gray-500 hover:text-white uppercase tracking-widest transition-colors"
          >
            Disconnect
          </button>
        {:else}
          <button
            on:click={connectWallet}
            disabled={connecting}
            class="bg-white hover:bg-red-600 hover:text-white text-black px-5 py-2 text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
          >
            {#if connecting}Connecting...{:else}Connect Wallet{/if}
          </button>
        {/if}
      </div>

      <!-- Mobile hamburger -->
      <button
        on:click={() => (mobileMenuOpen = !mobileMenuOpen)}
        class="md:hidden flex flex-col justify-center items-center gap-1.5 w-8 h-8 group"
        aria-label="Toggle menu"
      >
        <span
          class="block w-5 h-0.5 bg-white transition-all {mobileMenuOpen
            ? 'rotate-45 translate-y-2'
            : ''}"
        ></span>
        <span
          class="block w-5 h-0.5 bg-white transition-all {mobileMenuOpen
            ? 'opacity-0'
            : ''}"
        ></span>
        <span
          class="block w-5 h-0.5 bg-white transition-all {mobileMenuOpen
            ? '-rotate-45 -translate-y-2'
            : ''}"
        ></span>
      </button>
    </div>
  </div>

  <!-- Mobile menu -->
  {#if mobileMenuOpen}
    <div class="md:hidden border-t border-white/5 bg-black">
      <nav class="flex flex-col divide-y divide-white/5">
        {#each navLinks as link}
          <a
            href={link.href}
            on:click={closeMobile}
            class="px-6 py-4 text-[11px] font-bold uppercase tracking-widest transition-colors {isActive(
              link.href,
            )
              ? 'text-red-500 bg-red-600/5'
              : 'text-gray-400 hover:text-white hover:bg-white/5'}"
          >
            {link.label}
          </a>
        {/each}

        {#if $isAuthenticated && $user}
          <a
            href="/profile/{$user.address}"
            on:click={closeMobile}
            class="px-6 py-4 flex items-center gap-3 {isActive('/profile')
              ? 'text-red-500 bg-red-600/5'
              : 'text-gray-400 hover:text-white hover:bg-white/5'}"
          >
            {#if $user.avatar}
              <img
                src={$user.avatar}
                alt="Avatar"
                class="w-6 h-6 rounded-full"
              />
            {:else}
              <div
                class="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center"
              >
                <span class="text-[10px] font-black text-white"
                  >{$user.username.charAt(0).toUpperCase()}</span
                >
              </div>
            {/if}
            <div class="flex flex-col leading-none">
              <span
                class="text-[8px] font-bold text-gray-600 uppercase tracking-widest"
                >Profile</span
              >
              <span class="text-[11px] font-bold text-white"
                >{$user.username}</span
              >
            </div>
          </a>
          <button
            on:click={disconnect}
            class="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-widest text-gray-600 hover:text-white hover:bg-white/5 transition-colors"
          >
            Disconnect
          </button>
        {:else}
          <div class="px-6 py-4">
            <button
              on:click={() => {
                connectWallet();
                closeMobile();
              }}
              disabled={connecting}
              class="w-full bg-red-600 hover:bg-white hover:text-black text-white py-3 text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
            >
              {#if connecting}Connecting...{:else}Connect Wallet{/if}
            </button>
          </div>
        {/if}
      </nav>
    </div>
  {/if}
</header>
