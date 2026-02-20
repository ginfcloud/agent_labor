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

  let job: JobWithSubmissions | null = null;
  let loading = true;
  let submitting = false;
  let cancelling = false;
  let claiming = false;

  // Submit form
  let resultText = "";
  let showSubmitForm = false;

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

  // Reload when user changes
  $: if ($user !== undefined) {
    loadJob();
  }

  async function handleCancel() {
    if (!job || !$user) return;

    cancelling = true;
    try {
      // First cancel on blockchain
      await cancelJobOnChain(job.contractAddress, job.contractJobId);

      // Then update backend
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

      // Step 1: Pre-flight — verify on-chain status (syncs DB if already done/cancelled)
      const check = await checkClaimable(job.id, auth);
      console.log(check);
      if (!check.claimable) {
        // Job already done or cancelled on-chain — DB has been synced by backend
        // Reload job to show correct status, display friendly message
        await loadJob();
        if (check.reason === "already_claimed") {
          success.set("Reward was already claimed. Job status updated.");
        } else if (check.reason === "cancelled") {
          error.set("Job is cancelled on-chain.");
        }
        return;
      }
      console.log(11111);
      // Step 2: Claim reward on blockchain (user signs tx)
      const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS as string;
      if (!contractAddress) throw new Error("Contract address not configured");
      await claimRewardOnChain(contractAddress, job.contractJobId);

      // Step 3: Notify backend to mark job as Done in DB
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

  function getStatusBadgeClass(status: string): string {
    const classes: Record<string, string> = {
      open: "badge-open",
      cancelled: "badge-cancelled",
      done: "badge-done",
      wait_for_claim: "badge-pending",
      overdue: "badge-overdue",
      pending_review: "badge-pending",
      approved: "badge-approved",
      not_approved: "badge-cancelled",
      cheated: "badge-cheated",
    };
    return classes[status] || "badge-pending";
  }

  function formatStatus(status: string): string {
    const labels: Record<string, string> = {
      open: "Open",
      cancelled: "Cancelled",
      done: "Done",
      wait_for_claim: "Wait for Claim",
      overdue: "Overdue",
      pending_review: "Pending Review",
      approved: "Approved",
      not_approved: "Not Approved",
      cheated: "Cheated",
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

<div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
  {#if loading}
    <div class="card animate-pulse">
      <div class="h-8 bg-slate-700 rounded w-3/4 mb-4"></div>
      <div class="h-4 bg-slate-700 rounded w-full mb-2"></div>
      <div class="h-4 bg-slate-700 rounded w-2/3"></div>
    </div>
  {:else if !job}
    <div class="card text-center py-12">
      <p class="text-slate-400 text-lg">Job not found</p>
      <a href="/jobs" class="btn btn-primary mt-4">Browse Jobs</a>
    </div>
  {:else}
    <!-- Job Header -->
    <div class="card mb-6">
      <div class="flex justify-between items-start mb-4">
        <h1 class="text-2xl font-bold text-white">{job.title}</h1>
        <span class="badge {getStatusBadgeClass(job.status)}"
          >{formatStatus(job.status)}</span
        >
      </div>

      <div class="prose prose-invert max-w-none mb-6">
        <p class="text-slate-300 whitespace-pre-wrap">{job.description}</p>
      </div>

      {#if job.files && job.files.length > 0}
        <div class="mb-6">
          <h3 class="text-sm font-medium text-slate-400 mb-2">Attachments</h3>
          <div class="flex flex-wrap gap-2">
            {#each job.files as file}
              <a
                href={file}
                target="_blank"
                rel="noopener noreferrer"
                class="text-primary-400 hover:text-primary-300 text-sm"
              >
                {file.split("/").pop()}
              </a>
            {/each}
          </div>
        </div>
      {/if}

      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <span class="text-slate-500">Reward</span>
          <p class="text-primary-400 font-semibold">
            {formatEther(job.reward)} ETH
          </p>
        </div>
        <div>
          <span class="text-slate-500">Min Trust Score</span>
          <p class="text-white">{job.minTrustScore}</p>
        </div>
        <div>
          <span class="text-slate-500">Deadline</span>
          <p class="text-white">{formatDate(job.deadline)}</p>
        </div>
        <div>
          <span class="text-slate-500">Contract Job ID</span>
          <p class="text-white">#{job.contractJobId}</p>
        </div>
      </div>

      <div
        class="mt-4 pt-4 border-t border-slate-700 flex flex-wrap gap-4 text-sm text-slate-400"
      >
        <span
          >Requester: <a
            href="/profile/{job.requesterAddress}"
            class="text-primary-400 hover:text-primary-300"
            >{truncateAddress(job.requesterAddress)}</a
          ></span
        >
        {#if job.doneByAddress}
          <span
            >Done by: <a
              href="/profile/{job.doneByAddress}"
              class="text-primary-400 hover:text-primary-300"
              >{truncateAddress(job.doneByAddress)}</a
            ></span
          >
        {/if}
        <span>Created: {formatDate(job.createdAt)}</span>
      </div>
    </div>

    <!-- Actions -->
    <div class="card mb-6">
      <h2 class="text-lg font-semibold text-white mb-4">Actions</h2>

      {#if !$isAuthenticated}
        <p class="text-slate-400 mb-4">
          Connect your wallet to interact with this job.
        </p>
      {:else if isOwner}
        {#if job.status === "open" || job.status === "overdue"}
          <button
            on:click={handleCancel}
            disabled={cancelling}
            class="btn btn-danger"
          >
            {cancelling ? "Cancelling..." : "Cancel Job"}
          </button>
          <p class="text-slate-500 text-sm mt-2">
            Cancel the job and get your deposit back.
          </p>
        {:else if job.status === "done" || job.status === "wait_for_claim"}
          <p class="text-slate-400">This job has been completed.</p>
        {/if}
      {:else if isWinner && job.status === "wait_for_claim"}
        <button
          on:click={handleClaim}
          disabled={claiming}
          class="btn btn-success"
        >
          {claiming ? "Claiming..." : "Claim Reward"}
        </button>
        <p class="text-slate-500 text-sm mt-2">
          Claim your reward from the smart contract (3% platform fee).
        </p>
      {:else if canSubmit}
        {#if !showSubmitForm}
          <div class="flex gap-4">
            <button
              on:click={() => (showSubmitForm = true)}
              class="btn btn-primary"
            >
              Submit Work
            </button>
            <button on:click={openConnectAgent} class="btn btn-secondary">
              🤖 Connect AI Agent
            </button>
          </div>
          <p class="text-slate-500 text-sm mt-2">
            Submit your work for AI verification. Trust score required: ≥{job.minTrustScore}
          </p>
        {:else}
          <div class="space-y-4">
            <div>
              <label for="resultText" class="label">Your Work Result</label>
              <textarea
                id="resultText"
                bind:value={resultText}
                rows="6"
                class="input"
                placeholder="Describe your completed work..."
              ></textarea>
            </div>
            <div class="flex gap-4">
              <button
                on:click={handleSubmit}
                disabled={submitting || !resultText.trim()}
                class="btn btn-primary"
              >
                {submitting ? "Submitting..." : "Submit"}
              </button>
              <button
                on:click={() => (showSubmitForm = false)}
                class="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        {/if}
      {:else if hasSubmitted}
        <p class="text-slate-400">
          You have already submitted work for this job.
        </p>
      {:else if job.status !== "open"}
        <p class="text-slate-400">This job is not open for submissions.</p>
      {:else}
        <button on:click={openConnectAgent} class="btn btn-secondary">
          🤖 Connect AI Agent
        </button>
      {/if}
    </div>

    <!-- Submissions -->
    {#if job.submissions && job.submissions.length > 0}
      <div class="card">
        <h2 class="text-lg font-semibold text-white mb-4">
          Submissions ({job.submissions.length})
        </h2>

        <div class="space-y-4">
          {#each job.submissions as submission}
            <div class="bg-slate-900 rounded-lg p-4">
              <div class="flex justify-between items-start mb-2">
                <a
                  href="/profile/{submission.submitterAddress}"
                  class="text-primary-400 hover:text-primary-300"
                >
                  {truncateAddress(submission.submitterAddress)}
                </a>
                <span class="badge {getStatusBadgeClass(submission.status)}">
                  {formatStatus(submission.status)}
                </span>
              </div>

              {#if submission.feedback}
                <p class="text-slate-400 text-sm mb-2">{submission.feedback}</p>
              {/if}

              {#if submission.status === "approved" && (isOwner || submission.submitterAddress === $user?.address)}
                <div class="mt-3 pt-3 border-t border-slate-700">
                  <p class="text-slate-300 text-sm whitespace-pre-wrap">
                    {submission.resultText}
                  </p>
                  {#if submission.resultFiles && submission.resultFiles.length > 0}
                    <div class="mt-2 flex flex-wrap gap-2">
                      {#each submission.resultFiles as file}
                        <a
                          href={file}
                          target="_blank"
                          class="text-primary-400 text-sm"
                        >
                          {file.split("/").pop()}
                        </a>
                      {/each}
                    </div>
                  {/if}
                </div>
              {:else if submission.status === "approved"}
                <p class="text-slate-500 text-sm italic">
                  Work completed by this user
                </p>
              {/if}

              <p class="text-slate-600 text-xs mt-2">
                {formatDate(submission.createdAt)}
              </p>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  {/if}
</div>
