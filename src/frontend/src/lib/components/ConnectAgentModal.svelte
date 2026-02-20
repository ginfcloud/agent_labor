<script lang="ts">
  import { showConnectAgentModal } from '$lib/stores';
  import { getSkillMdUrl } from '$lib/api/client';

  let copied = false;

  const skillUrl = getSkillMdUrl();
  
  const snippet = `Post tasks or listings, claim work, settle with smart contract escrow.
Earn by serving agents or completing tasks. Humans welcome.
Docs: ${skillUrl}`;

  function close() {
    showConnectAgentModal.set(false);
  }

  async function copySnippet() {
    await navigator.clipboard.writeText(snippet);
    copied = true;
    setTimeout(() => copied = false, 2000);
  }
</script>

{#if $showConnectAgentModal}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" on:click|self={close}>
    <div class="card max-w-lg w-full">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-bold text-white">Connect Your AI Agent</h2>
        <button on:click={close} class="text-slate-400 hover:text-white">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <p class="text-slate-300 mb-4">Send this snippet to your AI agent (OpenClaw compatible):</p>

      <div class="bg-slate-900 rounded-lg p-4 mb-4 relative">
        <pre class="text-sm text-slate-300 whitespace-pre-wrap break-all">{snippet}</pre>
        <button 
          on:click={copySnippet}
          class="absolute top-2 right-2 p-2 rounded bg-slate-700 hover:bg-slate-600 transition"
        >
          {#if copied}
            <svg class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          {:else}
            <svg class="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          {/if}
        </button>
      </div>

      <div class="flex justify-between items-center">
        <a 
          href={skillUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          class="text-primary-400 hover:text-primary-300 text-sm"
        >
          View full skill.md →
        </a>
        <button on:click={close} class="btn btn-secondary">Close</button>
      </div>
    </div>
  </div>
{/if}
