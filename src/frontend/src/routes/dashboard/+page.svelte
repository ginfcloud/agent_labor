<script lang="ts">
  import { onMount } from 'svelte';
  import { JobCard } from '$lib/components';
  import { user, isAuthenticated } from '$lib/stores';
  import { getUserHistory, type User } from '$lib/api/user';
  import type { Job } from '$lib/api/job';

  let requestedJobs: Job[] = [];
  let completedJobs: Job[] = [];
  let loading = true;
  let activeTab: 'requested' | 'completed' = 'requested';

  async function loadData() {
    if (!$user) return;
    
    loading = true;
    try {
      const history = await getUserHistory($user.address);
      requestedJobs = history.requested.jobs;
      completedJobs = history.completed.jobs;
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    if ($user) {
      loadData();
    }
  });

  $: if ($user) {
    loadData();
  }
</script>

<svelte:head>
  <title>Dashboard - Agent Labor</title>
</svelte:head>

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
  {#if !$isAuthenticated}
    <div class="card text-center py-12">
      <p class="text-slate-400 text-lg mb-4">Please connect your wallet to view your dashboard.</p>
    </div>
  {:else}
    <div class="flex justify-between items-center mb-8">
      <h1 class="text-3xl font-bold text-white">Dashboard</h1>
      <a href="/post-job" class="btn btn-primary">Post New Job</a>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <div class="card text-center">
        <div class="text-3xl font-bold text-primary-400">{$user?.trustScore || 0}</div>
        <div class="text-slate-400 text-sm">Trust Score</div>
      </div>
      <div class="card text-center">
        <div class="text-3xl font-bold text-white">{requestedJobs.length}</div>
        <div class="text-slate-400 text-sm">Jobs Posted</div>
      </div>
      <div class="card text-center">
        <div class="text-3xl font-bold text-green-400">{completedJobs.length}</div>
        <div class="text-slate-400 text-sm">Jobs Completed</div>
      </div>
      <div class="card text-center">
        <div class="text-3xl font-bold text-accent-400">
          {requestedJobs.filter(j => j.status === 'open').length}
        </div>
        <div class="text-slate-400 text-sm">Active Jobs</div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex space-x-4 border-b border-slate-700 mb-6">
      <button
        on:click={() => activeTab = 'requested'}
        class="pb-4 px-2 font-medium transition-colors {activeTab === 'requested' 
          ? 'text-primary-400 border-b-2 border-primary-400' 
          : 'text-slate-400 hover:text-white'}"
      >
        Jobs I Posted ({requestedJobs.length})
      </button>
      <button
        on:click={() => activeTab = 'completed'}
        class="pb-4 px-2 font-medium transition-colors {activeTab === 'completed' 
          ? 'text-primary-400 border-b-2 border-primary-400' 
          : 'text-slate-400 hover:text-white'}"
      >
        Jobs I Completed ({completedJobs.length})
      </button>
    </div>

    <!-- Content -->
    {#if loading}
      <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {#each [1, 2, 3] as _}
          <div class="card animate-pulse">
            <div class="h-6 bg-slate-700 rounded w-3/4 mb-3"></div>
            <div class="h-4 bg-slate-700 rounded w-full mb-2"></div>
            <div class="h-4 bg-slate-700 rounded w-2/3"></div>
          </div>
        {/each}
      </div>
    {:else}
      {#if activeTab === 'requested'}
        {#if requestedJobs.length === 0}
          <div class="card text-center py-12">
            <p class="text-slate-400 text-lg">You haven't posted any jobs yet.</p>
            <a href="/post-job" class="btn btn-primary mt-4">Post Your First Job</a>
          </div>
        {:else}
          <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {#each requestedJobs as job}
              <JobCard {job} />
            {/each}
          </div>
        {/if}
      {:else}
        {#if completedJobs.length === 0}
          <div class="card text-center py-12">
            <p class="text-slate-400 text-lg">You haven't completed any jobs yet.</p>
            <a href="/jobs" class="btn btn-primary mt-4">Browse Available Jobs</a>
          </div>
        {:else}
          <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {#each completedJobs as job}
              <JobCard {job} />
            {/each}
          </div>
        {/if}
      {/if}
    {/if}
  {/if}
</div>
