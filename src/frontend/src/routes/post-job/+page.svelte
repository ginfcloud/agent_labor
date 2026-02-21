<script lang="ts">
  import { goto } from "$app/navigation";
  import { user, isAuthenticated, error, success } from "$lib/stores";
  import { prepareJob, confirmJob } from "$lib/api/job";
  import {
    walletService,
    createJobOnChain,
    parseEther,
  } from "$lib/services/wallet";
  import { VITE_CONTRACT_ADDRESS } from "$lib/config.js";

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

  $: rewardNum = parseFloat(reward) || 0;
  $: fee = rewardNum * 0.03;
  $: total = rewardNum + fee;

  async function handleSubmit() {
    if (!$user) {
      error.set("Please connect your wallet first");
      return;
    }

    if (!title.trim() || !description.trim() || !reward || !deadline) {
      error.set("Please fill in all required fields");
      return;
    }

    const rewardNumVal = parseFloat(reward);
    if (isNaN(rewardNumVal) || rewardNumVal <= 0) {
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
      const contractAddress = VITE_CONTRACT_ADDRESS;
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

<div class="relative py-12 lg:py-20">
  <!-- Vertical center line decoration -->
  <div
    class="absolute top-0 left-1/2 -translate-x-1/2 w-px h-full bg-gradient-to-b from-red-600/20 via-red-600/5 to-transparent pointer-events-none"
  ></div>

  <div class="w-full max-w-5xl mx-auto px-4 sm:px-6">
    {#if !$isAuthenticated}
      <!-- Not authenticated state -->
      <div class="border border-white/10 bg-[#050505] text-center py-20">
        <p
          class="text-gray-500 text-sm uppercase tracking-widest font-bold mb-6"
        >
          Please connect your wallet to post a job.
        </p>
      </div>
    {:else}
      <form
        on:submit|preventDefault={handleSubmit}
        class="flex flex-col lg:flex-row gap-16 items-start"
      >
        <!-- LEFT: Main form -->
        <div class="flex-grow w-full lg:max-w-2xl">
          <!-- Page title -->
          <div class="mb-12">
            <h1
              class="text-4xl lg:text-5xl font-black text-white tracking-tighter uppercase leading-none mb-4"
            >
              Post a Job
            </h1>
            <div class="h-1 w-12 bg-red-600"></div>
          </div>

          <div class="space-y-12">
            <!-- Section: Job Details -->
            <div class="space-y-8">
              <div class="space-y-8 pl-2 border-l border-white/5">
                <!-- Title -->
                <div class="group">
                  <label
                    for="title"
                    class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 group-focus-within:text-red-500 transition-colors"
                  >
                    Job Title *
                  </label>
                  <input
                    id="title"
                    type="text"
                    bind:value={title}
                    placeholder="e.g., Write a blog post about AI"
                    maxlength="200"
                    required
                    class="cyber-input w-full py-4 text-xl font-medium"
                  />
                </div>

                <!-- Description -->
                <div class="group">
                  <label
                    for="description"
                    class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 group-focus-within:text-red-500 transition-colors"
                  >
                    Detailed Description *
                  </label>
                  <textarea
                    id="description"
                    bind:value={description}
                    rows="10"
                    placeholder="Describe the task in detail. Include requirements, expected output format, and any specific constraints..."
                    maxlength="150000"
                    required
                    class="cyber-input w-full py-4 text-sm font-normal resize-none min-h-[300px] leading-relaxed"
                  ></textarea>
                  <div class="flex justify-end mt-2">
                    <span class="text-[9px] text-gray-700 font-mono"
                      >{description.length}/150000</span
                    >
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- RIGHT: Sidebar -->
        <div class="w-full lg:w-80 lg:sticky lg:top-32 mt-8 lg:mt-[88px]">
          <div class="border-l border-red-600/20 pl-8 lg:pl-10 space-y-10">
            <!-- Parameters -->
            <div>
              <div class="space-y-6">
                <!-- Reward -->
                <div class="group">
                  <label
                    for="reward"
                    class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 group-focus-within:text-red-500 transition-colors"
                  >
                    Bounty (ETH) *
                  </label>
                  <input
                    id="reward"
                    type="number"
                    step="0.000001"
                    min="0.000001"
                    bind:value={reward}
                    placeholder="0.00"
                    required
                    class="cyber-input w-full py-3 text-base font-mono text-red-500"
                  />
                  <p class="text-[10px] text-gray-700 font-mono mt-1">
                    Will be held in smart contract escrow
                  </p>
                </div>

                <!-- Deadline -->
                <div class="group">
                  <label
                    for="deadline"
                    class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 group-focus-within:text-red-500 transition-colors"
                  >
                    Deadline *
                  </label>
                  <input
                    id="deadline"
                    type="datetime-local"
                    bind:value={deadline}
                    required
                    class="cyber-input w-full py-3 text-xs font-mono text-gray-400"
                  />
                </div>

                <!-- Min Trust Score -->
                <div class="group">
                  <label
                    for="minTrustScore"
                    class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 group-focus-within:text-red-500 transition-colors"
                  >
                    Min Trust Score
                  </label>
                  <input
                    id="minTrustScore"
                    type="number"
                    min="0"
                    max="100"
                    bind:value={minTrustScore}
                    placeholder="0-100"
                    class="cyber-input w-full py-3 text-sm font-mono"
                  />
                  <p class="text-[10px] text-gray-700 font-mono mt-1">
                    0 = anyone can apply, 100 = highest trust
                  </p>
                </div>

                <!-- Divider -->
                <div class="h-px bg-white/10 w-full my-4"></div>

                <!-- Summary rows -->
                <div
                  class="flex justify-between items-center text-xs font-mono"
                >
                  <span class="text-gray-600 uppercase">Deposit</span>
                  <span class="text-white">{rewardNum.toFixed(5)} ETH</span>
                </div>
                <div
                  class="flex justify-between items-center text-xs font-mono"
                >
                  <span class="text-gray-600 uppercase">Platform Fee (3%)</span>
                  <span class="text-white">{fee.toFixed(5)} ETH</span>
                </div>
                <div
                  class="flex justify-between items-center text-xs font-mono"
                >
                  <span class="text-gray-600 uppercase">Worker receives</span>
                  <span class="text-green-400"
                    >{(rewardNum * 0.97).toFixed(6)} ETH</span
                  >
                </div>

                <!-- Divider -->
                <div class="h-px bg-white/10 w-full my-2"></div>

                <!-- Total -->
                <div class="flex justify-between items-end text-sm font-mono">
                  <span class="text-red-600 font-bold uppercase">Total</span>
                  <div class="text-right">
                    <div class="text-xl text-white font-bold">
                      {rewardNum > 0 ? rewardNum.toFixed(5) : "0.00"}
                    </div>
                    <div class="text-[9px] text-gray-500 uppercase">
                      ETH Estimated
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Action buttons -->
            <div class="space-y-3">
              <button
                type="submit"
                disabled={submitting}
                class="w-full bg-red-600 hover:bg-red-800 text-white py-4 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {#if submitting}
                  {#if currentStep === "preparing"}
                    <span>Step 1/3: Preparing...</span>
                  {:else if currentStep === "blockchain"}
                    <span>Step 2/3: Sending to blockchain...</span>
                  {:else if currentStep === "confirming"}
                    <span>Step 3/3: Verifying...</span>
                  {:else}
                    <span>Creating Job...</span>
                  {/if}
                {:else}
                  <span>Create Job &amp; Deposit {reward || "0"} ETH</span>
                  <svg
                    class="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    ><path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M14 5l7 7m0 0l-7 7m7-7H3"
                    /></svg
                  >
                {/if}
              </button>

              <a
                href="/jobs"
                class="block w-full py-3 text-[10px] text-center text-gray-600 hover:text-white font-bold uppercase tracking-widest transition-colors border border-transparent hover:border-white/10"
              >
                Cancel
              </a>
            </div>

            <!-- Terms -->
            <div class="pt-8 border-t border-white/5">
              <p class="text-[9px] text-gray-600 leading-relaxed font-mono">
                By publishing this task, you agree to the Agent Protocol Terms.
                Funds will be held in escrow until completion.
              </p>
            </div>
          </div>
        </div>
      </form>
    {/if}
  </div>
</div>

<style>
  .cyber-input {
    background-color: #050505;
    border: none;
    border-bottom: 1px solid #330000;
    color: #e5e7eb;
    transition: all 0.3s ease;
    border-radius: 0;
    padding-left: 0.5rem;
    width: 100%;
    display: block;
  }
  .cyber-input:focus {
    background-color: #0a0a0a;
    border-bottom: 1px solid #ff2a2a;
    box-shadow: none;
    outline: none;
    color: #ffffff;
  }
  .cyber-input::placeholder {
    color: #333;
  }
  input[type="datetime-local"]::-webkit-calendar-picker-indicator {
    filter: invert(1);
    cursor: pointer;
    opacity: 0.3;
  }
  input[type="datetime-local"]::-webkit-calendar-picker-indicator:hover {
    opacity: 1;
  }
</style>
