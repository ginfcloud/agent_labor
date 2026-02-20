<script lang="ts">
  import { page } from "$app/stores";
  import { onMount } from "svelte";
  import { JobCard } from "$lib/components";
  import {
    getUser,
    getUserHistory,
    updateUsername,
    updateAvatar,
    uploadAvatarFile,
    type User,
  } from "$lib/api/user";
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
  let loading = true;
  let activeTab: "requested" | "completed" = "requested";

  // Edit mode
  let editing = false;
  let newUsername = "";
  let saving = false;
  let avatarFile: FileList | null = null;

  $: address = $page.params.address;
  $: isOwnProfile = $currentUser && $currentUser.address === address;

  async function loadProfile() {
    loading = true;
    try {
      profile = await getUser(address);
      const history = await getUserHistory(address);
      requestedJobs = history.requested.jobs;
      completedJobs = history.completed.jobs;
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

      // Upload avatar if changed
      if (avatarFile && avatarFile.length > 0) {
        const avatarUrl = await uploadAvatarFile(
          avatarFile[0],
          $currentUser.address,
        );
        await updateAvatar(avatarUrl, auth);
      }

      // Update username if changed
      if (newUsername && newUsername !== profile.username) {
        await updateUsername(newUsername, auth);
      }

      success.set("Profile updated successfully");
      editing = false;
      await loadProfile();

      // Update current user store
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

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
  {#if loading}
    <div class="card animate-pulse">
      <div class="flex items-center space-x-4">
        <div class="w-20 h-20 bg-slate-700 rounded-full"></div>
        <div>
          <div class="h-6 bg-slate-700 rounded w-32 mb-2"></div>
          <div class="h-4 bg-slate-700 rounded w-48"></div>
        </div>
      </div>
    </div>
  {:else if !profile}
    <div class="card text-center py-12">
      <p class="text-slate-400 text-lg">User not found</p>
    </div>
  {:else}
    <!-- Profile Header -->
    <div class="card mb-8">
      {#if editing}
        <div class="space-y-4">
          <div class="flex items-center space-x-4">
            <div class="relative">
              {#if profile.avatar}
                <img
                  src={profile.avatar}
                  alt="Avatar"
                  class="w-20 h-20 rounded-full"
                />
              {:else}
                <div
                  class="w-20 h-20 rounded-full bg-primary-600 flex items-center justify-center"
                >
                  <span class="text-2xl font-bold"
                    >{profile.username.charAt(0).toUpperCase()}</span
                  >
                </div>
              {/if}
              <label
                class="absolute bottom-0 right-0 bg-slate-700 rounded-full p-1 cursor-pointer hover:bg-slate-600"
              >
                <svg
                  class="w-4 h-4 text-white"
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
            <div class="flex-1">
              <label for="username" class="label">Username</label>
              <input
                id="username"
                type="text"
                bind:value={newUsername}
                class="input max-w-xs"
                maxlength="20"
                pattern="[a-zA-Z0-9]+"
              />
              <p class="text-slate-500 text-sm mt-1">
                Alphanumeric only, max 20 characters
              </p>
            </div>
          </div>
          <div class="flex gap-4">
            <button
              on:click={saveProfile}
              disabled={saving}
              class="btn btn-primary"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button on:click={cancelEditing} class="btn btn-secondary"
              >Cancel</button
            >
          </div>
        </div>
      {:else}
        <div class="flex items-start justify-between">
          <div class="flex items-center space-x-4">
            {#if profile.avatar}
              <img
                src={profile.avatar}
                alt="Avatar"
                class="w-20 h-20 rounded-full"
              />
            {:else}
              <div
                class="w-20 h-20 rounded-full bg-primary-600 flex items-center justify-center"
              >
                <span class="text-2xl font-bold"
                  >{profile.username.charAt(0).toUpperCase()}</span
                >
              </div>
            {/if}
            <div>
              <h1 class="text-2xl font-bold text-white">{profile.username}</h1>
              <p class="text-slate-400 font-mono text-sm">{profile.address}</p>
              <div class="flex items-center gap-4 mt-2">
                <span class="text-sm">
                  <span class="text-slate-500">Trust Score:</span>
                  <span class="text-primary-400 font-semibold ml-1"
                    >{profile.trustScore}</span
                  >
                </span>
                <span class="text-sm">
                  <span class="text-slate-500">Joined:</span>
                  <span class="text-slate-300 ml-1"
                    >{new Date(profile.createdAt).toLocaleDateString()}</span
                  >
                </span>
              </div>
            </div>
          </div>
          {#if isOwnProfile}
            <button on:click={startEditing} class="btn btn-secondary">
              Edit Profile
            </button>
          {/if}
        </div>
      {/if}
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
      <div class="card text-center">
        <div class="text-3xl font-bold text-primary-400">
          {profile.trustScore}
        </div>
        <div class="text-slate-400 text-sm">Trust Score</div>
      </div>
      <div class="card text-center">
        <div class="text-3xl font-bold text-white">{requestedJobs.length}</div>
        <div class="text-slate-400 text-sm">Jobs Posted</div>
      </div>
      <div class="card text-center">
        <div class="text-3xl font-bold text-green-400">
          {completedJobs.length}
        </div>
        <div class="text-slate-400 text-sm">Jobs Completed</div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex space-x-4 border-b border-slate-700 mb-6">
      <button
        on:click={() => (activeTab = "requested")}
        class="pb-4 px-2 font-medium transition-colors {activeTab ===
        'requested'
          ? 'text-primary-400 border-b-2 border-primary-400'
          : 'text-slate-400 hover:text-white'}"
      >
        Jobs Posted ({requestedJobs.length})
      </button>
      <button
        on:click={() => (activeTab = "completed")}
        class="pb-4 px-2 font-medium transition-colors {activeTab ===
        'completed'
          ? 'text-primary-400 border-b-2 border-primary-400'
          : 'text-slate-400 hover:text-white'}"
      >
        Jobs Completed ({completedJobs.length})
      </button>
    </div>

    <!-- Job Lists -->
    {#if activeTab === "requested"}
      {#if requestedJobs.length === 0}
        <div class="card text-center py-12">
          <p class="text-slate-400">No jobs posted yet.</p>
        </div>
      {:else}
        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {#each requestedJobs as job}
            <JobCard {job} />
          {/each}
        </div>
      {/if}
    {:else if completedJobs.length === 0}
      <div class="card text-center py-12">
        <p class="text-slate-400">No jobs completed yet.</p>
      </div>
    {:else}
      <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {#each completedJobs as job}
          <JobCard {job} />
        {/each}
      </div>
    {/if}
  {/if}
</div>
