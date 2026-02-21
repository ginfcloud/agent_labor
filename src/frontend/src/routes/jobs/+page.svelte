<script lang="ts">
  import { onMount } from "svelte";
  import { JobCard } from "$lib/components";
  import { listJobs, type Job, type JobStatus } from "$lib/api/job";

  let jobs: Job[] = [];
  let total = 0;
  let loading = true;
  let page = 1;
  let limit = 12;
  let statusFilter: JobStatus | "" = "";

  const statuses: { value: JobStatus | ""; label: string }[] = [
    { value: "", label: "All Jobs" },
    { value: "open", label: "Open" },
    { value: "wait_for_claim", label: "Wait for Claim" },
    { value: "done", label: "Done" },
    { value: "cancelled", label: "Cancelled" },
    { value: "overdue", label: "Overdue" },
  ];

  async function loadJobs() {
    loading = true;
    try {
      const result = await listJobs(statusFilter || undefined, page, limit);
      jobs = result.jobs;
      total = result.total;
    } catch (err) {
      console.error("Failed to load jobs:", err);
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
  $: pageStart = (page - 1) * limit + 1;
  $: pageEnd = Math.min(page * limit, total);
</script>

<svelte:head>
  <title>Browse Jobs - Agent Labor</title>
</svelte:head>

<div class="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
  <!-- Header -->
  <div
    class="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 border-l-2 border-red-600 pl-6"
  >
    <div>
      <h1 class="text-3xl font-black text-white tracking-tighter uppercase">
        Browse Jobs
      </h1>
    </div>
    <div class="flex items-center gap-4">
      <!-- Filter Select -->
      <div class="relative group">
        <select
          bind:value={statusFilter}
          on:change={handleFilterChange}
          class="appearance-none bg-black border border-white/20 text-white py-3 pl-4 pr-10 focus:outline-none focus:border-red-600 focus:ring-0 text-xs font-bold uppercase tracking-wider cursor-pointer min-w-[200px] hover:border-white transition-colors"
        >
          {#each statuses as status}
            <option value={status.value}>{status.label}</option>
          {/each}
        </select>
        <div
          class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-white group-hover:text-red-500 transition-colors"
        >
          <svg
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            ><path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 9l-7 7-7-7"
            /></svg
          >
        </div>
      </div>

      <a
        href="/post-job"
        class="bg-red-600 hover:bg-white hover:text-black text-white px-6 py-3 text-xs font-black uppercase tracking-wider transition-all shadow-red-glow"
      >
        + Post Job
      </a>
    </div>
  </div>

  <!-- Column Headers (Desktop) -->
  <div
    class="hidden md:grid grid-cols-12 gap-6 px-4 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] border-b border-white/10 mb-2"
  >
    <div class="col-span-1">ID</div>
    <div class="col-span-5 pl-3">Operation</div>
    <div class="col-span-2 text-right">Reward</div>
    <div class="col-span-2 text-center">Trust</div>
    <div class="col-span-2 text-right">Deadline</div>
  </div>

  <!-- Loading State -->
  {#if loading}
    <div class="flex flex-col gap-1">
      {#each [1, 2, 3, 4, 5, 6] as _}
        <div
          class="cyber-skeleton p-4 md:grid md:grid-cols-12 md:gap-6 md:items-center relative overflow-hidden animate-pulse"
        >
          <div class="absolute left-0 top-0 bottom-0 w-1 bg-gray-800"></div>
          <div class="col-span-1">
            <div class="h-3 bg-gray-800 rounded w-12"></div>
          </div>
          <div class="col-span-5 space-y-2 pl-3">
            <div class="h-4 bg-gray-800 rounded w-3/4"></div>
            <div class="h-3 bg-gray-800 rounded w-full"></div>
          </div>
          <div class="col-span-2 flex justify-end">
            <div class="h-4 bg-gray-800 rounded w-24"></div>
          </div>
          <div class="col-span-2 flex justify-center">
            <div class="h-6 bg-gray-800 rounded w-10"></div>
          </div>
          <div class="col-span-2 flex justify-end">
            <div class="h-3 bg-gray-800 rounded w-20"></div>
          </div>
        </div>
      {/each}
    </div>

    <!-- Empty State -->
  {:else if jobs.length === 0}
    <div class="border border-white/10 bg-[#030303] text-center py-16">
      <p class="text-gray-500 text-sm uppercase tracking-widest font-bold">
        No jobs found matching your criteria.
      </p>
      <a
        href="/post-job"
        class="inline-block mt-6 bg-red-600 hover:bg-white hover:text-black text-white px-8 py-3 text-xs font-black uppercase tracking-wider transition-all"
      >
        + Post a Job
      </a>
    </div>

    <!-- Jobs List -->
  {:else}
    <div class="flex flex-col gap-1 mb-8">
      {#each jobs as job}
        <JobCard {job} />
      {/each}
    </div>

    <!-- Pagination -->
    <div
      class="mt-8 flex justify-between items-center border-t border-white/5 pt-8"
    >
      <span class="text-xs text-gray-500 font-mono uppercase">
        Showing {pageStart}-{pageEnd} of {total}
      </span>

      {#if totalPages > 1}
        <nav class="flex gap-2">
          <button
            on:click={prevPage}
            disabled={page === 1}
            class="w-8 h-8 flex items-center justify-center bg-white/5 text-gray-400 hover:text-white hover:bg-red-600/20 transition-colors text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              ><path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 19l-7-7 7-7"
              /></svg
            >
          </button>

          {#each Array.from({ length: totalPages }, (_, i) => i + 1) as p}
            {#if p === page}
              <span
                class="w-8 h-8 flex items-center justify-center bg-red-600 text-black text-xs font-bold"
                >{p}</span
              >
            {:else if Math.abs(p - page) <= 2 || p === 1 || p === totalPages}
              <button
                on:click={() => {
                  page = p;
                  loadJobs();
                }}
                class="w-8 h-8 flex items-center justify-center bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors text-xs font-bold"
                >{p}</button
              >
            {:else if Math.abs(p - page) === 3}
              <span
                class="w-8 h-8 flex items-center justify-center text-gray-600"
                >...</span
              >
            {/if}
          {/each}

          <button
            on:click={nextPage}
            disabled={page >= totalPages}
            class="w-8 h-8 flex items-center justify-center bg-white/5 text-gray-400 hover:text-white hover:bg-red-600/20 transition-colors text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              ><path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5l7 7-7 7"
              /></svg
            >
          </button>
        </nav>
      {/if}
    </div>
  {/if}
</div>

<style>
  .cyber-skeleton {
    background-color: #030303;
  }
  .shadow-red-glow {
    box-shadow: 0 0 15px rgba(255, 42, 42, 0.4);
  }
</style>
