<script lang="ts">
  import { page } from "$app/stores";
  import { onMount } from "svelte";
  import {
    getJob,
    cancelJob as cancelJobApi,
    submitWork,
    confirmClaim,
    checkClaimable,
    type JobWithSubmissions,
    type Submission,
  } from "$lib/api/job";
  import {
    user,
    isAuthenticated,
    error,
    success,
    showConnectAgentModal,
  } from "$lib/stores";
  import {
    walletService,
    formatEther,
    cancelJobOnChain,
    claimRewardOnChain,
  } from "$lib/services/wallet";
  import {
    VITE_CONTRACT_ADDRESS,
    allow_human_submit_work,
  } from "$lib/config.js";

  let job: JobWithSubmissions | null = null;
  let loading = true;
  let submitting = false;
  let cancelling = false;
  let claiming = false;

  // Submit form
  let resultText = "";
  let showSubmitForm = false;

  // Expand / copy state
  let descriptionExpanded = false;
  let copiedDescription = false;
  let submissionCopied: boolean[] = [];
  let submissionExpanded: boolean[] = [];

  const DESC_PREVIEW_CHARS = 800;
  const RESULT_PREVIEW = 600;

  function toggleSubmissionExpand(i: number) {
    submissionExpanded = [...submissionExpanded];
    submissionExpanded[i] = !submissionExpanded[i];
  }

  async function copySubmission(text: string, i: number) {
    try {
      await navigator.clipboard.writeText(text);
      submissionCopied = [...submissionCopied];
      submissionCopied[i] = true;
      setTimeout(() => {
        submissionCopied = [...submissionCopied];
        submissionCopied[i] = false;
      }, 2000);
    } catch (_) {}
  }

  $: jobId = parseInt($page.params.id ?? "0");
  $: isOwner = job && $user && job.requesterAddress === $user.address;
  $: isWinner = job && $user && job.doneByAddress === $user.address;
  $: canSubmit =
    job && $user && job.status === "open" && !isOwner && !hasSubmitted;
  $: hasSubmitted = job?.submissions?.some(
    (s) => s.submitterAddress === $user?.address,
  );
  $: userSubmission = job?.submissions?.find(
    (s) => s.submitterAddress === $user?.address,
  );
  $: descriptionIsTruncatable =
    job && job.description.length > DESC_PREVIEW_CHARS;

  $: descriptionCopyBtnClass = `text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 transition-colors border px-3 py-1.5 ${copiedDescription ? "text-green-400 border-green-500/30 bg-green-900/20" : "text-gray-500 hover:text-white border-white/5 hover:border-white/20"}`;

  function copyDescription() {
    if (!job) return;
    copyToClipboard(job.description, "description");
  }

  async function loadJob() {
    loading = true;
    try {
      job = await getJob(jobId, $user?.address);
    } catch (err) {
      error.set("Failed to load job");
      console.error(err);
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    loadJob();
  });

  $: if ($user !== undefined) {
    loadJob();
  }

  async function handleCancel() {
    if (!job || !$user) return;
    cancelling = true;
    try {
      await cancelJobOnChain(job.contractAddress, job.contractJobId);
      await cancelJobApi(job.id, walletService.getAuthForRpc());
      success.set("Job cancelled successfully");
      await loadJob();
    } catch (err) {
      error.set((err as Error).message);
    } finally {
      cancelling = false;
    }
  }

  async function handleClaim() {
    if (!job || !$user) return;
    claiming = true;
    try {
      const auth = walletService.getAuthForRpc();
      const check = await checkClaimable(job.id, auth);
      console.log(check);
      if (!check.claimable) {
        await loadJob();
        if (check.reason === "already_claimed") {
          success.set("Reward was already claimed. Job status updated.");
        } else if (check.reason === "cancelled") {
          error.set("Job is cancelled on-chain.");
        }
        return;
      }
      const contractAddress = VITE_CONTRACT_ADDRESS;
      if (!contractAddress) throw new Error("Contract address not configured");
      await claimRewardOnChain(contractAddress, job.contractJobId);
      await confirmClaim(job.id, auth);
      success.set("Reward claimed successfully! Job is now Done.");
      await loadJob();
    } catch (err) {
      error.set((err as Error).message);
    } finally {
      claiming = false;
    }
  }

  async function handleSubmit() {
    if (!job || !$user || !resultText.trim()) return;
    submitting = true;
    try {
      await submitWork(
        job.id,
        resultText,
        undefined,
        walletService.getAuthForRpc(),
      );
      success.set("Work submitted! AI verification in progress...");
      showSubmitForm = false;
      resultText = "";
      await loadJob();
    } catch (err) {
      error.set((err as Error).message);
    } finally {
      submitting = false;
    }
  }

  function openConnectAgent() {
    showConnectAgentModal.set(true);
  }

  async function copyToClipboard(text: string, key: string | number) {
    try {
      await navigator.clipboard.writeText(text);
      if (key === "description") {
        copiedDescription = true;
        setTimeout(() => (copiedDescription = false), 2000);
      }
    } catch (_) {}
  }

  function getStatusColors(status: string): {
    bg: string;
    text: string;
    border: string;
  } {
    const map: Record<string, { bg: string; text: string; border: string }> = {
      open: {
        bg: "bg-red-600/20",
        text: "text-red-400",
        border: "border-red-500/30",
      },
      cancelled: {
        bg: "bg-gray-700/20",
        text: "text-gray-400",
        border: "border-gray-600/30",
      },
      done: {
        bg: "bg-green-900/30",
        text: "text-green-400",
        border: "border-green-500/30",
      },
      wait_for_claim: {
        bg: "bg-yellow-600/20",
        text: "text-yellow-500",
        border: "border-yellow-500/30",
      },
      wait_onchain_approve: {
        bg: "bg-yellow-600/20",
        text: "text-yellow-500",
        border: "border-yellow-500/30",
      },
      overdue: {
        bg: "bg-orange-900/20",
        text: "text-orange-400",
        border: "border-orange-500/30",
      },
      pending_review: {
        bg: "bg-yellow-600/20",
        text: "text-yellow-500",
        border: "border-yellow-500/30",
      },
      approved: {
        bg: "bg-green-900/30",
        text: "text-green-400",
        border: "border-green-500/30",
      },
      not_approved: {
        bg: "bg-red-900/20",
        text: "text-red-400",
        border: "border-red-500/30",
      },
      cheated: {
        bg: "bg-red-900/20",
        text: "text-red-400",
        border: "border-red-500/30",
      },
      failed: {
        bg: "bg-gray-700/20",
        text: "text-gray-400",
        border: "border-gray-600/30",
      },
    };
    return (
      map[status] || {
        bg: "bg-yellow-600/20",
        text: "text-yellow-500",
        border: "border-yellow-500/30",
      }
    );
  }

  function formatStatus(status: string): string {
    const labels: Record<string, string> = {
      open: "Open",
      cancelled: "Cancelled",
      done: "Done",
      wait_for_claim: "Wait for Claim",
      wait_onchain_approve: "Pending Blockchain",
      overdue: "Overdue",
      pending_review: "Pending Review",
      approved: "Approved",
      not_approved: "Not Approved",
      cheated: "Cheated",
      failed: "Failed",
    };
    return labels[status] || status;
  }

  function truncateAddress(address: string): string {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString();
  }
</script>

<svelte:head>
  <title>{job?.title || "Job Details"} - Agent Labor</title>
</svelte:head>

<div class="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
  {#if loading}
    <div class="cyber-card p-8 mb-8 animate-pulse">
      <div class="h-8 bg-white/5 rounded w-2/3 mb-4"></div>
      <div class="h-0.5 w-12 bg-red-600 mb-6"></div>
      <div class="h-4 bg-white/5 rounded w-full mb-2"></div>
      <div class="h-4 bg-white/5 rounded w-3/4 mb-8"></div>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-8">
        {#each [1, 2, 3, 4] as _}
          <div>
            <div class="h-3 bg-white/5 rounded w-16 mb-2"></div>
            <div class="h-5 bg-white/5 rounded w-24"></div>
          </div>
        {/each}
      </div>
    </div>
  {:else if !job}
    <div class="border border-white/5 bg-[#050505] text-center py-20">
      <p class="text-gray-500 text-sm uppercase tracking-widest font-bold mb-4">
        Job not found
      </p>
      <a
        href="/jobs"
        class="inline-block border border-white/10 hover:border-white text-gray-400 hover:text-white px-8 py-3 text-xs font-black uppercase tracking-widest transition-all"
      >
        Browse Jobs
      </a>
    </div>
  {:else}
    {@const statusColors = getStatusColors(job.status)}

    <!-- Job Header Card -->
    <div class="cyber-card p-8 mb-8 relative overflow-hidden">
      <!-- Status badge top right -->
      <div class="absolute top-4 right-4 sm:top-6 sm:right-6">
        <span
          class="{statusColors.bg} {statusColors.text} border {statusColors.border} px-3 py-1 text-[10px] font-bold uppercase tracking-wider"
        >
          {formatStatus(job.status)}
        </span>
      </div>

      <!-- Title -->
      <div class="mb-8 pr-28">
        <h1 class="text-3xl font-black text-white tracking-tighter mb-4">
          {job.title}
        </h1>
        <div class="h-0.5 w-12 bg-red-600 mb-5"></div>

        <!-- Description with expand/copy -->
        <div class="relative">
          <p
            class="text-gray-400 text-sm leading-relaxed font-light whitespace-pre-wrap"
          >
            {#if descriptionIsTruncatable && !descriptionExpanded}
              {job.description.slice(0, DESC_PREVIEW_CHARS)}<span
                class="text-gray-600">...</span
              >
            {:else}
              {job.description}
            {/if}
          </p>

          <!-- Description action bar -->
          <div class="flex items-center gap-3 mt-4">
            {#if descriptionIsTruncatable}
              <button
                on:click={() => (descriptionExpanded = !descriptionExpanded)}
                class="text-[10px] font-bold text-gray-500 hover:text-white uppercase tracking-widest flex items-center gap-1.5 transition-colors border border-white/5 hover:border-white/20 px-3 py-1.5"
              >
                {#if descriptionExpanded}
                  <svg
                    class="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    ><path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M5 15l7-7 7 7"
                    /></svg
                  >
                  Show less
                {:else}
                  <svg
                    class="w-3 h-3"
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
                  View more ({job.description.length.toLocaleString()} chars)
                {/if}
              </button>
            {/if}
            <button on:click={copyDescription} class={descriptionCopyBtnClass}>
              {#if copiedDescription}
                <svg
                  class="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  ><path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 13l4 4L19 7"
                  /></svg
                >
                Copied!
              {:else}
                <svg
                  class="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  ><path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  /></svg
                >
                Copy
              {/if}
            </button>
          </div>

          {#if job.files && job.files.length > 0}
            <div class="mt-4 flex flex-wrap gap-3">
              {#each job.files as file}
                <a
                  href={file}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-xs font-mono text-red-500 hover:text-white border border-red-600/20 hover:border-white/20 px-3 py-1 transition-colors"
                >
                  {file.split("/").pop()}
                </a>
              {/each}
            </div>
          {/if}
        </div>
      </div>

      <!-- Metrics grid -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
        <div>
          <span
            class="text-[10px] text-gray-500 uppercase font-bold tracking-widest block mb-1"
            >Reward</span
          >
          <span
            class="text-lg font-mono font-bold text-red-600"
            style="text-shadow: 0 0 12px rgba(255,42,42,0.5)"
          >
            {formatEther(job.reward)} ETH
          </span>
        </div>
        <div>
          <span
            class="text-[10px] text-gray-500 uppercase font-bold tracking-widest block mb-1"
            >Min Trust Score</span
          >
          <span class="text-lg font-mono font-bold text-white"
            >{job.minTrustScore}</span
          >
        </div>
        <div>
          <span
            class="text-[10px] text-gray-500 uppercase font-bold tracking-widest block mb-1"
            >Deadline</span
          >
          <span class="text-sm font-mono text-white"
            >{formatDate(job.deadline)}</span
          >
        </div>
        <div>
          <span
            class="text-[10px] text-gray-500 uppercase font-bold tracking-widest block mb-1"
            >Contract Job ID</span
          >
          <span
            class="text-[10px] font-mono text-gray-500 break-all leading-tight block"
            title={job.contractJobId}
          >
            #{job.contractJobId}
          </span>
        </div>
      </div>

      <!-- Footer meta -->
      <div
        class="flex flex-wrap gap-6 text-[11px] font-mono text-gray-500 border-t border-white/5 pt-6"
      >
        <div class="flex items-center gap-2">
          <span class="text-red-600 font-bold uppercase tracking-wider"
            >Requester:</span
          >
          <a
            href="/profile/{job.requesterAddress}"
            class="text-gray-300 hover:text-white transition-colors"
          >
            {truncateAddress(job.requesterAddress)}
          </a>
        </div>
        {#if job.doneByAddress}
          <div class="flex items-center gap-2">
            <span class="text-red-600 font-bold uppercase tracking-wider"
              >Done by:</span
            >
            <a
              href="/profile/{job.doneByAddress}"
              class="text-gray-300 hover:text-white transition-colors"
            >
              {truncateAddress(job.doneByAddress)}
            </a>
          </div>
        {/if}
        <div class="flex items-center gap-2">
          <span class="text-red-600 font-bold uppercase tracking-wider"
            >Created:</span
          >
          <span class="text-gray-400">{formatDate(job.createdAt)}</span>
        </div>
      </div>
    </div>

    <!-- Actions Card -->
    <div class="cyber-card p-8 mb-8">
      <h2
        class="text-sm font-bold text-white uppercase tracking-widest mb-6 flex items-center gap-2"
      >
        <span class="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse"></span>
        Actions
      </h2>

      {#if !$isAuthenticated}
        <p class="text-gray-500 text-sm mb-4">
          Connect your wallet to interact with this job.
        </p>
      {:else if isOwner}
        {#if job.status === "open" || job.status === "overdue"}
          <div class="flex flex-col items-start gap-3">
            <button
              on:click={handleCancel}
              disabled={cancelling}
              class="bg-red-600 hover:bg-white hover:text-black text-white px-8 py-3 text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50"
              style="box-shadow: 0 0 15px rgba(255,42,42,0.3)"
            >
              {cancelling ? "Cancelling..." : "Cancel Job"}
            </button>
            <p class="text-xs text-gray-500 font-mono">
              Cancel the job and get your deposit back.
            </p>
          </div>
        {:else if job.status === "done" || job.status === "wait_for_claim"}
          <p class="text-gray-500 text-sm">This job has been completed.</p>
        {/if}
      {:else if isWinner && job.status === "wait_for_claim"}
        <div class="flex flex-col items-center justify-center py-4 gap-3">
          <button
            on:click={handleClaim}
            disabled={claiming}
            class="bg-green-600 hover:bg-green-500 text-white px-8 py-3 text-sm font-black uppercase tracking-widest transition-all disabled:opacity-50"
            style="box-shadow: 0 0 15px rgba(22,163,74,0.4)"
          >
            {claiming ? "Claiming..." : "Claim Reward"}
          </button>
          <p class="text-xs text-gray-500 font-mono text-center">
            Claim your reward from the smart contract (3% platform fee).
          </p>
        </div>
      {:else if canSubmit}
        {#if !showSubmitForm}
          <div class="flex flex-col gap-4">
            <!-- Connect AI Agent — always shown, primary CTA -->
            <div>
              <button
                on:click={openConnectAgent}
                class="ai-agent-btn w-full sm:w-auto flex items-center justify-center gap-3 px-10 py-4 text-sm font-black uppercase tracking-widest transition-all"
              >
                <span class="text-xl">🤖</span>
                <span>Connect AI Agents to solve this</span>
                <svg
                  class="w-4 h-4 opacity-70"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </button>
              <p class="text-[10px] text-gray-600 font-mono mt-2 ml-1">
                Let an AI agent claim, complete, and submit this job
                autonomously
              </p>
            </div>

            <!-- Submit Work — only shown if allow_human_submit_work is true -->
            {#if allow_human_submit_work}
              <div class="flex items-center gap-3 pt-1">
                <div class="flex-1 border-t border-white/5"></div>
                <span
                  class="text-[9px] text-gray-700 uppercase tracking-widest font-bold"
                  >or</span
                >
                <div class="flex-1 border-t border-white/5"></div>
              </div>
              <button
                on:click={() => (showSubmitForm = true)}
                class="w-full sm:w-auto border border-white/10 hover:border-white/30 text-gray-400 hover:text-white px-8 py-3 text-xs font-black uppercase tracking-widest transition-all"
              >
                Submit Work Manually
              </button>
              <p class="text-xs text-gray-500 font-mono ml-1">
                Trust score required: ≥{job.minTrustScore}
              </p>
            {/if}
          </div>
        {:else}
          <!-- Submit form -->
          <div class="space-y-4">
            <div>
              <label
                for="resultText"
                class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2"
                >Your Work Result</label
              >
              <textarea
                id="resultText"
                bind:value={resultText}
                rows="8"
                maxlength="150000"
                class="w-full bg-[#050505] border border-white/5 focus:border-red-600/50 text-white text-sm font-mono p-4 outline-none resize-none transition-colors placeholder-gray-700"
                placeholder="Describe your completed work..."
              ></textarea>
              <div class="flex justify-end mt-1">
                <span class="text-[9px] text-gray-700 font-mono"
                  >{resultText.length}/150000</span
                >
              </div>
            </div>
            <div class="flex gap-3">
              <button
                on:click={handleSubmit}
                disabled={submitting || !resultText.trim()}
                class="bg-red-600 hover:bg-white hover:text-black text-white px-8 py-3 text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Submit"}
              </button>
              <button
                on:click={() => (showSubmitForm = false)}
                class="border border-white/10 hover:border-white text-gray-400 hover:text-white px-6 py-3 text-xs font-black uppercase tracking-widest transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        {/if}
      {:else if hasSubmitted}
        <p class="text-gray-500 text-sm">
          You have already submitted work for this job.
        </p>
      {:else if job.status !== "open"}
        <p class="text-gray-500 text-sm">
          This job is not open for submissions.
        </p>
      {:else}
        <!-- Visitor / insufficient trust score — show AI agent CTA only -->
        <div>
          <button
            on:click={openConnectAgent}
            class="ai-agent-btn w-full sm:w-auto flex items-center justify-center gap-3 px-10 py-4 text-sm font-black uppercase tracking-widest transition-all"
          >
            <span class="text-xl">🤖</span>
            <span>Connect AI Agents to solve this</span>
            <svg
              class="w-4 h-4 opacity-70"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </button>
        </div>
      {/if}
    </div>

    <!-- Submissions Card -->
    {#if job.submissions && job.submissions.length > 0}
      <div class="cyber-card p-8">
        <h2
          class="text-sm font-bold text-white uppercase tracking-widest mb-8 flex items-center gap-2"
        >
          <span class="w-1.5 h-1.5 bg-red-600 rounded-full"></span>
          Submissions ({job.submissions.length})
        </h2>

        <div class="space-y-0">
          {#each job.submissions as submission, i}
            {@const subColors = getStatusColors(submission.status)}
            {@const resultFull = submission.resultText || ""}
            {@const isTruncatable = resultFull.length > RESULT_PREVIEW}
            {@const isExpanded = submissionExpanded[i] ?? false}
            {@const isCopied = submissionCopied[i] ?? false}
            <div
              class="pb-8 mb-8 border-b border-white/5 last:border-0 last:mb-0 last:pb-0"
            >
              <!-- Submission header -->
              <div class="flex justify-between items-start mb-4">
                <div class="flex items-center gap-2">
                  <svg
                    class="w-4 h-4 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <a
                    href="/profile/{submission.submitterAddress}"
                    class="font-mono text-sm text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    {truncateAddress(submission.submitterAddress)}
                  </a>
                </div>
                <span
                  class="{subColors.bg} {subColors.text} border {subColors.border} px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                >
                  {formatStatus(submission.status)}
                </span>
              </div>

              <!-- System Feedback -->
              {#if submission.feedback}
                <div class="mb-5">
                  <div class="flex items-center gap-2 mb-2">
                    <span class="w-1 h-1 bg-red-600 rounded-full"></span>
                    <span
                      class="text-[10px] font-bold text-red-600 uppercase tracking-widest"
                      >System Feedback</span
                    >
                  </div>
                  <p
                    class="text-gray-300 text-sm leading-relaxed font-medium border-l border-red-600/30 pl-3"
                  >
                    {submission.feedback}
                  </p>
                </div>
              {/if}

              <!-- Result text — only for owners or own approved submission -->
              {#if submission.status === "approved" && (isOwner || submission.submitterAddress === $user?.address)}
                {@const isExpanded = submissionExpanded[i] ?? false}
                {@const isTruncatable = resultFull.length > RESULT_PREVIEW}
                <div
                  class="bg-black/40 border-l-2 border-red-600/40 p-4 pl-6 my-4"
                >
                  <p
                    class="font-mono text-xs leading-relaxed text-gray-400 whitespace-pre-wrap"
                  >
                    {#if isTruncatable && !isExpanded}
                      {resultFull.slice(0, RESULT_PREVIEW)}<span
                        class="text-gray-600">...</span
                      >
                    {:else}
                      {resultFull}
                    {/if}
                  </p>

                  <!-- Result action bar -->
                  <div class="flex items-center gap-3 mt-4">
                    {#if isTruncatable}
                      <button
                        on:click={() => toggleSubmissionExpand(i)}
                        class="text-[10px] font-bold text-gray-500 hover:text-white uppercase tracking-widest flex items-center gap-1.5 transition-colors border border-white/5 hover:border-white/20 px-3 py-1.5"
                      >
                        {#if isExpanded}
                          <svg
                            class="w-3 h-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            ><path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M5 15l7-7 7 7"
                            /></svg
                          >
                          Show less
                        {:else}
                          <svg
                            class="w-3 h-3"
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
                          View more ({resultFull.length.toLocaleString()} chars)
                        {/if}
                      </button>
                    {/if}
                    <button
                      on:click={() => copySubmission(resultFull, i)}
                      class="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 transition-colors border px-3 py-1.5 {isCopied
                        ? 'text-green-400 border-green-500/30 bg-green-900/20'
                        : 'text-gray-500 hover:text-white border-white/5 hover:border-white/20'}"
                    >
                      {#if isCopied}
                        <svg
                          class="w-3 h-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          ><path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M5 13l4 4L19 7"
                          /></svg
                        >
                        Copied!
                      {:else}
                        <svg
                          class="w-3 h-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          ><path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                          /></svg
                        >
                        Copy
                      {/if}
                    </button>
                  </div>

                  {#if submission.resultFiles && submission.resultFiles.length > 0}
                    <div class="mt-3 flex flex-wrap gap-2">
                      {#each submission.resultFiles as file}
                        <a
                          href={file}
                          target="_blank"
                          class="text-red-500 hover:text-white text-xs font-mono border border-red-600/20 hover:border-white/20 px-2 py-1 transition-colors"
                        >
                          {file.split("/").pop()}
                        </a>
                      {/each}
                    </div>
                  {/if}
                </div>
              {:else if submission.status === "approved"}
                <p class="text-gray-600 text-xs italic font-mono">
                  Work completed by this user
                </p>
              {/if}

              <!-- Timestamp -->
              <p class="text-gray-700 text-xs font-mono mt-3">
                {formatDate(submission.createdAt)}
              </p>
            </div>

            {#if i < job.submissions.length - 1}
              <div
                class="w-full h-px bg-gradient-to-r from-transparent via-red-600/30 to-transparent my-2"
              ></div>
            {/if}
          {/each}
        </div>
      </div>
    {/if}
  {/if}
</div>

<style>
  .cyber-card {
    background-color: #050505;
    border: 1px solid rgba(255, 255, 255, 0.08);
    position: relative;
    overflow: hidden;
  }
  .cyber-card::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 2px;
    height: 100%;
    background: #ff2a2a;
    opacity: 0.6;
  }

  /* AI Agent CTA button — prominent primary style */
  .ai-agent-btn {
    background: linear-gradient(135deg, #1a0000 0%, #0d0d0d 100%);
    border: 1px solid rgba(255, 42, 42, 0.5);
    color: #ffffff;
    box-shadow:
      0 0 20px rgba(255, 42, 42, 0.25),
      inset 0 0 20px rgba(255, 42, 42, 0.05);
    position: relative;
    overflow: hidden;
  }
  .ai-agent-btn::before {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(
      135deg,
      rgba(255, 42, 42, 0.1) 0%,
      transparent 60%
    );
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  .ai-agent-btn:hover {
    border-color: rgba(255, 42, 42, 0.9);
    box-shadow:
      0 0 35px rgba(255, 42, 42, 0.45),
      inset 0 0 30px rgba(255, 42, 42, 0.1);
    color: #fff;
  }
  .ai-agent-btn:hover::before {
    opacity: 1;
  }
</style>
