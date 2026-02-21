<script lang="ts">
  import { page } from "$app/stores";
  import { onMount } from "svelte";
  import { JobCard } from "$lib/components";
  import {
    getUser,
    getUserHistory,
    getUserStats,
    updateUsername,
    updateAvatar,
    uploadAvatarFile,
    type User,
    type UserStats,
  } from "$lib/api/user";
  import { formatEther } from "$lib/services/wallet";
  import {
    user as currentUser,
    isAuthenticated,
    error,
    success,
  } from "$lib/stores";
  import { walletService } from "$lib/services/wallet";
  import type { Job } from "$lib/api/job";

  let profile: User | null = null;
  let requestedJobs: Job[] = [];
  let completedJobs: Job[] = [];
  let totalStats: UserStats | null = null;
  let loading = true;
  let activeTab: "requested" | "completed" = "requested";

  // Edit mode
  let editing = false;
  let newUsername = "";
  let saving = false;
  let avatarFile: FileList | null = null;

  $: address = $page.params.address as string;
  $: isOwnProfile = $currentUser && $currentUser.address === address;

  async function loadProfile() {
    loading = true;
    try {
      [profile, totalStats] = await Promise.all([
        getUser(address),
        getUserStats(address),
      ]);
      const history = await getUserHistory(address);
      requestedJobs = history.requested.jobs as any;
      completedJobs = history.completed.jobs as any;
    } catch (err) {
      console.error("Failed to load profile:", err);
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    loadProfile();
  });

  $: if (address) {
    loadProfile();
  }

  function startEditing() {
    if (profile) {
      newUsername = profile.username;
      editing = true;
    }
  }

  function cancelEditing() {
    editing = false;
    newUsername = "";
    avatarFile = null;
  }

  async function saveProfile() {
    if (!$currentUser || !profile) return;

    saving = true;
    try {
      const auth = walletService.getAuthForRpc();

      if (avatarFile && avatarFile.length > 0) {
        const avatarUrl = await uploadAvatarFile(
          avatarFile[0],
          $currentUser.address,
        );
        await updateAvatar(avatarUrl, auth);
      }

      if (newUsername && newUsername !== profile.username) {
        await updateUsername(newUsername, auth);
      }

      success.set("Profile updated successfully");
      editing = false;
      await loadProfile();

      if (profile) {
        currentUser.updateProfile(profile);
      }
    } catch (err) {
      error.set((err as Error).message);
    } finally {
      saving = false;
    }
  }

  function truncateAddress(addr: string): string {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  }
</script>

<svelte:head>
  <title>{profile?.username || "Profile"} - Agent Labor</title>
</svelte:head>

<div class="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
  {#if loading}
    <!-- Loading skeleton -->
    <div class="cyber-card p-8 mb-8 relative overflow-hidden animate-pulse">
      <div class="absolute top-0 left-0 w-1 h-full bg-red-600"></div>
      <div class="flex items-center gap-6">
        <div class="w-24 h-24 rounded-full bg-white/5"></div>
        <div class="space-y-3">
          <div class="h-8 bg-white/5 rounded w-48"></div>
          <div class="h-3 bg-white/5 rounded w-64"></div>
          <div class="h-3 bg-white/5 rounded w-32"></div>
        </div>
      </div>
    </div>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
      {#each [1, 2, 3, 4] as _}
        <div class="cyber-card p-6 animate-pulse">
          <div class="h-10 bg-white/5 rounded mb-2 w-16 mx-auto"></div>
          <div class="h-3 bg-white/5 rounded w-20 mx-auto"></div>
        </div>
      {/each}
    </div>
  {:else if !profile}
    <div class="border border-white/5 bg-[#050505] text-center py-20">
      <p class="text-gray-500 text-sm uppercase tracking-widest font-bold">
        User not found
      </p>
    </div>
  {:else}
    <!-- Profile Header Card -->
    <div class="cyber-profile-card p-8 mb-8 relative overflow-hidden">
      <div
        class="absolute top-0 left-0 w-1 h-full bg-red-600"
        style="box-shadow: 0 0 15px rgba(255,42,42,0.4)"
      ></div>

      {#if editing}
        <!-- Edit Mode -->
        <div class="pl-4 space-y-6">
          <div
            class="flex flex-col sm:flex-row items-start sm:items-center gap-6"
          >
            <!-- Avatar edit -->
            <div class="relative group flex-shrink-0">
              {#if profile.avatar}
                <img
                  src={profile.avatar}
                  alt="Avatar"
                  class="w-24 h-24 rounded-full object-cover ring-1 ring-white/10"
                />
              {:else}
                <div
                  class="w-24 h-24 rounded-full bg-[#0A0A0A] border border-white/10 flex items-center justify-center"
                >
                  <span class="text-3xl font-black text-gray-500"
                    >{profile.username.charAt(0).toUpperCase()}</span
                  >
                </div>
              {/if}
              <label
                class="absolute bottom-0 right-0 w-7 h-7 bg-red-600 flex items-center justify-center cursor-pointer hover:bg-red-500 transition-colors rounded-full"
              >
                <svg
                  class="w-3.5 h-3.5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                  />
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <input
                  type="file"
                  accept="image/*"
                  bind:files={avatarFile}
                  class="hidden"
                />
              </label>
            </div>
            <!-- Username input -->
            <div class="flex-1">
              <label
                for="username"
                class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2"
                >Username</label
              >
              <input
                id="username"
                type="text"
                bind:value={newUsername}
                class="bg-[#050505] border-b border-red-600/30 focus:border-red-600 text-white text-lg font-bold w-full max-w-xs outline-none py-1 px-0 transition-colors placeholder-gray-700"
                maxlength="20"
                pattern="[a-zA-Z0-9]+"
              />
              <p class="text-gray-600 text-[10px] mt-1 uppercase tracking-wide">
                Alphanumeric only, max 20 characters
              </p>
            </div>
          </div>
          <div class="flex gap-3">
            <button
              on:click={saveProfile}
              disabled={saving}
              class="bg-red-600 hover:bg-white hover:text-black text-white px-8 py-3 text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button
              on:click={cancelEditing}
              class="border border-white/10 hover:border-white text-gray-400 hover:text-white px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      {:else}
        <!-- View Mode -->
        <div
          class="pl-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
        >
          <div class="flex items-center gap-6">
            <!-- Avatar -->
            {#if profile.avatar}
              <img
                src={profile.avatar}
                alt="Avatar"
                class="w-24 h-24 rounded-full object-cover ring-1 ring-white/10 flex-shrink-0"
              />
            {:else}
              <div
                class="w-24 h-24 rounded-full bg-[#0A0A0A] border border-white/10 flex items-center justify-center flex-shrink-0 relative group overflow-hidden"
              >
                <span
                  class="text-3xl font-black text-gray-500 group-hover:text-red-600 transition-colors select-none"
                >
                  {profile.username.charAt(0).toUpperCase()}
                </span>
                <div
                  class="absolute inset-0 bg-red-600/10 opacity-0 group-hover:opacity-100 transition-opacity"
                ></div>
              </div>
            {/if}

            <!-- Info -->
            <div>
              <h1 class="text-3xl font-black text-white tracking-tighter mb-1">
                {profile.username}
              </h1>
              <div
                class="flex items-center gap-1.5 text-xs font-mono text-gray-500 mb-3"
              >
                <svg
                  class="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                  />
                </svg>
                <span
                  title={profile.address}
                  class="hover:text-white transition-colors cursor-default"
                >
                  {profile.address}
                </span>
              </div>
              <div
                class="flex items-center gap-4 text-xs font-bold uppercase tracking-wider"
              >
                <span class="flex items-center gap-1">
                  <span class="text-red-600">Trust Score:</span>
                  <span class="text-white">{profile.trustScore}</span>
                </span>
                <span class="text-gray-600"
                  >Joined: {new Date(
                    profile.createdAt,
                  ).toLocaleDateString()}</span
                >
              </div>
            </div>
          </div>

          {#if isOwnProfile}
            <button
              on:click={startEditing}
              class="bg-red-600 hover:bg-white hover:text-black text-white px-8 py-3 text-[10px] font-black uppercase tracking-widest transition-all flex-shrink-0"
              style="box-shadow: 0 0 10px rgba(255,42,42,0.3)"
            >
              Edit Profile
            </button>
          {/if}
        </div>
      {/if}
    </div>

    <!-- Stats Grid -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
      <div
        class="cyber-stat-card p-6 flex flex-col items-center justify-center text-center group"
      >
        <h3
          class="text-4xl font-black mb-2 group-hover:scale-110 transition-transform"
          style="color:#FF2A2A;text-shadow:0 0 12px rgba(255,42,42,0.6)"
        >
          {profile.trustScore}
        </h3>
        <span
          class="text-[10px] font-bold text-gray-500 uppercase tracking-widest"
          >Trust Score</span
        >
      </div>
      <div
        class="cyber-stat-card p-6 flex flex-col items-center justify-center text-center group"
      >
        <h3
          class="text-4xl font-black mb-2 group-hover:scale-110 transition-transform"
          style="color:#FF2A2A;text-shadow:0 0 12px rgba(255,42,42,0.6)"
        >
          {requestedJobs.length}
        </h3>
        <span
          class="text-[10px] font-bold text-gray-500 uppercase tracking-widest"
          >Jobs Posted</span
        >
      </div>
      <div
        class="cyber-stat-card p-6 flex flex-col items-center justify-center text-center group"
      >
        <h3
          class="text-4xl font-black mb-2 group-hover:scale-110 transition-transform"
          style="color:#FF2A2A;text-shadow:0 0 12px rgba(255,42,42,0.6)"
        >
          {completedJobs.length}
        </h3>
        <span
          class="text-[10px] font-bold text-gray-500 uppercase tracking-widest"
          >Jobs Completed</span
        >
      </div>
      <div
        class="cyber-stat-card p-6 flex flex-col items-center justify-center text-center group"
      >
        <h3
          class="text-4xl font-black mb-2 group-hover:scale-110 transition-transform"
          style="color:#FF2A2A;text-shadow:0 0 12px rgba(255,42,42,0.6)"
        >
          {totalStats
            ? parseFloat(formatEther(totalStats.totalEarnings)).toFixed(3)
            : "..."}
        </h3>
        <span
          class="text-[10px] font-bold text-gray-500 uppercase tracking-widest"
          >Total Earned (ETH)</span
        >
      </div>
    </div>

    <!-- Tabs -->
    <div class="mb-8">
      <div class="flex items-center gap-8 border-b border-white/10">
        <button
          on:click={() => (activeTab = "requested")}
          class="pb-4 px-2 text-[10px] font-bold uppercase tracking-widest transition-colors {activeTab ===
          'requested'
            ? 'text-red-600 border-b-2 border-red-600'
            : 'text-gray-500 hover:text-white'}"
          style={activeTab === "requested" ? "margin-bottom: -1px" : ""}
        >
          Jobs Posted ({requestedJobs.length})
        </button>
        <button
          on:click={() => (activeTab = "completed")}
          class="pb-4 px-2 text-[10px] font-bold uppercase tracking-widest transition-colors {activeTab ===
          'completed'
            ? 'text-red-600 border-b-2 border-red-600'
            : 'text-gray-500 hover:text-white'}"
          style={activeTab === "completed" ? "margin-bottom: -1px" : ""}
        >
          Jobs Completed ({completedJobs.length})
        </button>
      </div>
    </div>

    <!-- Job Lists -->
    {#if activeTab === "requested"}
      {#if requestedJobs.length === 0}
        <div class="border border-white/5 bg-[#050505] text-center py-16">
          <p class="text-gray-500 text-xs uppercase tracking-widest font-bold">
            No jobs posted yet.
          </p>
        </div>
      {:else}
        <!-- Column headers -->
        <div
          class="hidden md:grid grid-cols-12 gap-4 px-5 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-white/10 mb-1 bg-[#050505]"
        >
          <div class="col-span-1 text-center">#</div>
          <div class="col-span-5">Job Details</div>
          <div class="col-span-2 text-right">Reward</div>
          <div class="col-span-2 text-center">Trust Req</div>
          <div class="col-span-2 text-right">Deadline</div>
        </div>
        <div class="flex flex-col gap-1">
          {#each requestedJobs as job}
            <JobCard {job} />
          {/each}
        </div>
      {/if}
    {:else if completedJobs.length === 0}
      <div class="border border-white/5 bg-[#050505] text-center py-16">
        <p class="text-gray-500 text-xs uppercase tracking-widest font-bold">
          No jobs completed yet.
        </p>
      </div>
    {:else}
      <div
        class="hidden md:grid grid-cols-12 gap-4 px-5 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-white/10 mb-1 bg-[#050505]"
      >
        <div class="col-span-1 text-center">#</div>
        <div class="col-span-5">Job Details</div>
        <div class="col-span-2 text-right">Reward</div>
        <div class="col-span-2 text-center">Trust Req</div>
        <div class="col-span-2 text-right">Deadline</div>
      </div>
      <div class="flex flex-col gap-1">
        {#each completedJobs as job}
          <JobCard {job} />
        {/each}
      </div>
    {/if}
  {/if}
</div>

<style>
  .cyber-profile-card {
    background-color: #050505;
    border: 1px solid rgba(255, 255, 255, 0.05);
    transition:
      border-color 0.3s ease,
      box-shadow 0.3s ease;
  }
  .cyber-profile-card:hover {
    border-color: rgba(255, 42, 42, 0.2);
    box-shadow: 0 0 20px rgba(255, 42, 42, 0.08);
  }
  .cyber-stat-card {
    background-color: #050505;
    border: 1px solid rgba(255, 255, 255, 0.05);
    transition: all 0.3s ease;
  }
  .cyber-stat-card:hover {
    border-color: rgba(255, 42, 42, 0.3);
    box-shadow: 0 0 15px rgba(255, 42, 42, 0.1);
  }
</style>
