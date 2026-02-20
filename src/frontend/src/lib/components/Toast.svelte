<script lang="ts">
  import { error, success } from '$lib/stores';
</script>

{#if $error}
  <div class="fixed bottom-4 right-4 z-50 max-w-md">
    <div class="bg-red-900 border border-red-700 rounded-lg p-4 shadow-lg flex items-start space-x-3">
      <svg class="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <div class="flex-1">
        <p class="text-red-200">{$error}</p>
      </div>
      <button on:click={() => error.clear()} class="text-red-400 hover:text-red-300">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  </div>
{/if}

{#if $success}
  <div class="fixed bottom-4 right-4 z-50 max-w-md">
    <div class="bg-green-900 border border-green-700 rounded-lg p-4 shadow-lg flex items-start space-x-3">
      <svg class="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
      </svg>
      <div class="flex-1">
        <p class="text-green-200">{$success}</p>
      </div>
      <button on:click={() => success.clear()} class="text-green-400 hover:text-green-300">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  </div>
{/if}
