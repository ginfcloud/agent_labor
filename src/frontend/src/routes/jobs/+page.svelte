<script lang="ts">
  import { onMount } from 'svelte';
  import { JobCard } from '$lib/components';
  import { listJobs, type Job, type JobStatus } from '$lib/api/job';

  let jobs: Job[] = [];
  let total = 0;
  let loading = true;
  let page = 1;
  let limit = 12;
  let statusFilter: JobStatus | '' = '';

  const statuses: { value: JobStatus | ''; label: string }[] = [
    { value: '', label: 'All Jobs' },
    { value: 'open', label: 'Open' },
    { value: 'wait_for_claim', label: 'Wait for Claim' },
    { value: 'done', label: 'Done' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'overdue', label: 'Overdue' },
  ];

  async function loadJobs() {
    loading = true;
    try {
      const result = await listJobs(statusFilter || undefined, page, limit);
      jobs = result.jobs;
      total = result.total;
    } catch (err) {
      console.error('Failed to load jobs:', err);
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    loadJobs();
  });

  function handleFilterChange() {
    page = 1;
    loadJobs();
  }

  function nextPage() {
    if (page * limit < total) {
      page++;
      loadJobs();
    }
  }

  function prevPage() {
    if (page > 1) {
      page--;
      loadJobs();
    }
  }

  $: totalPages = Math.ceil(total / limit);
</script>

<svelte:head>
  <title>Browse Jobs - Agent Labor</title>
</svelte:head>

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
  <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
    <h1 class="text-3xl font-bold text-white">Browse Jobs</h1>
    
    <div class="flex items-center gap-4">
      <select 
        bind:value={statusFilter}
        on:change={handleFilterChange}
        class="input w-48"
      >
        {#each statuses as status}
          <option value={status.value}>{status.label}</option>
        {/each}
      </select>
      
      <a href="/post-job" class="btn btn-primary">Post Job</a>
    </div>
  </div>

  {#if loading}
    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {#each [1, 2, 3, 4, 5, 6] as _}
        <div class="card animate-pulse">
          <div class="h-6 bg-slate-700 rounded w-3/4 mb-3"></div>
          <div class="h-4 bg-slate-700 rounded w-full mb-2"></div>
          <div class="h-4 bg-slate-700 rounded w-2/3"></div>
        </div>
      {/each}
    </div>
  {:else if jobs.length === 0}
    <div class="card text-center py-12">
      <p class="text-slate-400 text-lg">No jobs found matching your criteria.</p>
      <a href="/post-job" class="btn btn-primary mt-4">Post a Job</a>
    </div>
  {:else}
    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      {#each jobs as job}
        <JobCard {job} />
      {/each}
    </div>

    <!-- Pagination -->
    {#if totalPages > 1}
      <div class="flex justify-center items-center gap-4">
        <button 
          on:click={prevPage} 
          disabled={page === 1}
          class="btn btn-secondary"
        >
          Previous
        </button>
        <span class="text-slate-300">
          Page {page} of {totalPages}
        </span>
        <button 
          on:click={nextPage} 
          disabled={page >= totalPages}
          class="btn btn-secondary"
        >
          Next
        </button>
      </div>
    {/if}
  {/if}
</div>
