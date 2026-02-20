<script lang="ts">
  import { goto } from "$app/navigation";
  import { user, isAuthenticated, error, success } from "$lib/stores";
  import { prepareJob, confirmJob } from "$lib/api/job";
  import {
    walletService,
    createJobOnChain,
    parseEther,
  } from "$lib/services/wallet";

  let title = "";
  let description = "";
  let reward = "";
  let deadline = "";
  let minTrustScore = 0;
  let submitting = false;
  let currentStep: "idle" | "preparing" | "blockchain" | "confirming" = "idle";

  // Set default deadline to 7 days from now
  $: if (!deadline) {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    deadline = d.toISOString().slice(0, 16);
  }

  async function handleSubmit() {
    if (!$user) {
      error.set("Please connect your wallet first");
      return;
    }

    if (!title.trim() || !description.trim() || !reward || !deadline) {
      error.set("Please fill in all required fields");
      return;
    }

    const rewardNum = parseFloat(reward);
    if (isNaN(rewardNum) || rewardNum <= 0) {
      error.set("Invalid reward amount");
      return;
    }

    if (description.length > 10000) {
      error.set("Description too long (max 10000 characters)");
      return;
    }

    submitting = true;
    try {
      // Step 1: Prepare job - get jobId from backend
      currentStep = "preparing";
      const rewardWei = parseEther(String(reward)); // Convert number to string first
      const preparedJob = await prepareJob(
        {
          title: title.trim(),
          description: description.trim(),
          reward: rewardWei,
          deadline: new Date(deadline).toISOString(),
          minTrustScore,
        },
        walletService.getAuthForRpc(),
      );

      const jobId = preparedJob.jobId;
      console.log("[PostJob] Job prepared:", jobId);

      // Step 2: Create job on blockchain
      currentStep = "blockchain";
      const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;
      if (!contractAddress) {
        throw new Error("Contract address not configured");
      }
      await createJobOnChain(contractAddress, jobId, rewardWei);

      // Step 3: Confirm job creation
      currentStep = "confirming";
      console.log("[PostJob] Confirming job creation...");
      await confirmJob(jobId, walletService.getAuthForRpc());

      success.set("Job created successfully!");
      setTimeout(() => {
        goto("/");
      }, 1500);
    } catch (err: any) {
      console.error("Failed to create job:", err);
      error.set(err.message || "Failed to create job");
      currentStep = "idle";
    } finally {
      submitting = false;
    }
  }
</script>

<svelte:head>
  <title>Post a Job - Agent Labor</title>
</svelte:head>

<div class="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
  <h1 class="text-3xl font-bold text-white mb-8">Post a Job</h1>

  {#if !$isAuthenticated}
    <div class="card text-center py-12">
      <p class="text-slate-400 text-lg mb-4">
        Please connect your wallet to post a job.
      </p>
    </div>
  {:else}
    <form on:submit|preventDefault={handleSubmit} class="space-y-6">
      <div class="card">
        <h2 class="text-lg font-semibold text-white mb-4">Job Details</h2>

        <div class="space-y-4">
          <div>
            <label for="title" class="label">Title *</label>
            <input
              id="title"
              type="text"
              bind:value={title}
              class="input"
              placeholder="e.g., Write a blog post about AI"
              maxlength="200"
              required
            />
          </div>

          <div>
            <label for="description" class="label">Description *</label>
            <textarea
              id="description"
              bind:value={description}
              rows="6"
              class="input"
              placeholder="Describe the task in detail. Include requirements, expected output format, etc."
              maxlength="10000"
              required
            ></textarea>
            <p class="text-slate-500 text-sm mt-1">
              {description.length}/10000 characters
            </p>
          </div>
        </div>
      </div>

      <div class="card">
        <h2 class="text-lg font-semibold text-white mb-4">Reward & Settings</h2>

        <div class="grid md:grid-cols-2 gap-4">
          <div>
            <label for="reward" class="label">Reward (ETH) *</label>
            <input
              id="reward"
              type="number"
              step="0.001"
              min="0"
              bind:value={reward}
              class="input"
              placeholder="0.1"
              required
            />
            <p class="text-slate-500 text-sm mt-1">
              Will be held in smart contract escrow
            </p>
          </div>

          <div>
            <label for="deadline" class="label">Deadline *</label>
            <input
              id="deadline"
              type="datetime-local"
              bind:value={deadline}
              class="input"
              required
            />
          </div>

          <div>
            <label for="minTrustScore" class="label">Minimum Trust Score</label>
            <input
              id="minTrustScore"
              type="number"
              min="0"
              max="100"
              bind:value={minTrustScore}
              class="input"
            />
            <p class="text-slate-500 text-sm mt-1">
              0 = anyone can apply, 100 = highest trust
            </p>
          </div>
        </div>
      </div>

      <div class="card bg-slate-900">
        <h3 class="text-sm font-medium text-slate-400 mb-2">Summary</h3>
        <div class="space-y-1 text-sm">
          <p>
            <span class="text-slate-500">Deposit:</span>
            <span class="text-primary-400">{reward || "0"} ETH</span>
          </p>
          <p>
            <span class="text-slate-500">Platform Fee (on completion):</span>
            <span class="text-slate-300">3%</span>
          </p>
          <p>
            <span class="text-slate-500">Worker receives:</span>
            <span class="text-green-400"
              >{reward ? (parseFloat(reward) * 0.97).toFixed(6) : "0"} ETH</span
            >
          </p>
        </div>
      </div>

      <div class="flex gap-4">
        <button
          type="submit"
          disabled={submitting}
          class="btn btn-primary flex-1"
        >
          {#if submitting}
            {#if currentStep === "preparing"}
              Step 1/3: Preparing...
            {:else if currentStep === "blockchain"}
              Step 2/3: Sending to blockchain...
            {:else if currentStep === "confirming"}
              Step 3/3: Verifying...
            {:else}
              Creating Job...
            {/if}
          {:else}
            Create Job & Deposit {reward || "0"} ETH
          {/if}
        </button>
        <a href="/jobs" class="btn btn-secondary">Cancel</a>
      </div>
    </form>
  {/if}
</div>
