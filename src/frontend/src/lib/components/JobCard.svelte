<script lang="ts">
  import type { Job } from "$lib/api/job";
  import { formatEther } from "$lib/services/wallet";

  export let job: Job;

  function getStatusBarClass(status: string): string {
    const classes: Record<string, string> = {
      open: "status-bar-open",
      cancelled: "status-bar-cancelled",
      done: "status-bar-done",
      wait_for_claim: "status-bar-progress",
      overdue: "status-bar-overdue",
    };
    return classes[status] || "status-bar-progress";
  }

  function getStatusBadgeClass(status: string): string {
    const classes: Record<string, string> = {
      open: "badge-cyber-open",
      cancelled: "badge-cyber-cancelled",
      done: "badge-cyber-done",
      wait_for_claim: "badge-cyber-progress",
      overdue: "badge-cyber-overdue",
    };
    return classes[status] || "badge-cyber-progress";
  }

  function formatStatus(status: string): string {
    const labels: Record<string, string> = {
      open: "Open",
      cancelled: "Cancelled",
      done: "Done",
      wait_for_claim: "Wait for Claim",
      overdue: "Overdue",
    };
    return labels[status] || status;
  }

  function truncateAddress(address: string): string {
    if (address.length <= 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  function formatContractId(id: string | number): string {
    const s = String(id);
    if (s.length <= 8) return s;
    return `${s.slice(0, 5)}...${s.slice(-3)}`;
  }

  function formatDeadline(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = date.getTime() - now.getTime();

    if (diff < 0) return "EXPIRED";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days}d ${hours}h left`;
    if (hours > 0) return `${hours}h left`;

    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${minutes}m left`;
  }
</script>

<a
  href="/jobs/{job.id}"
  class="cyber-row group p-4 md:grid md:grid-cols-12 md:gap-6 md:items-center relative overflow-hidden block {job.status ===
    'cancelled' || job.status === 'overdue'
    ? 'opacity-60 hover:opacity-100'
    : ''}"
>
  <div
    class="absolute left-0 top-0 bottom-0 w-1 {getStatusBarClass(job.status)}"
  ></div>

  <!-- ID -->
  <div class="col-span-1 mb-2 md:mb-0">
    <div
      class="font-mono text-xs text-gray-500 truncate"
      title="#{job.contractJobId}"
    >
      #{formatContractId(job.contractJobId)}
    </div>
  </div>

  <!-- Operation -->
  <div
    class="col-span-5 flex flex-col justify-center mb-3 md:mb-0 pl-3 md:pl-0"
  >
    <div class="flex items-center gap-3">
      <h3
        class="text-base font-bold text-white group-hover:text-red-500 transition-colors truncate tracking-tight uppercase"
      >
        {job.title}
      </h3>
      <span class={getStatusBadgeClass(job.status)}
        >{formatStatus(job.status)}</span
      >
    </div>
    <p class="text-xs text-gray-500 font-medium description-clamp mt-1">
      {job.description}
    </p>
    <div class="flex items-center gap-2 mt-2">
      <span class="text-[10px] text-gray-600 uppercase font-bold tracking-wider"
        >By:</span
      >
      <span
        class="text-[10px] text-gray-400 font-mono truncate max-w-[180px]"
        title={job.requesterAddress}
        >{truncateAddress(job.requesterAddress)}</span
      >
    </div>
  </div>

  <!-- Reward -->
  <div class="col-span-2 flex flex-col items-end justify-center">
    <span
      class="text-[10px] text-gray-600 md:hidden uppercase tracking-wider mb-1"
      >Reward</span
    >
    <span
      class="font-mono text-base font-bold {job.status === 'cancelled' ||
      job.status === 'overdue'
        ? 'text-red-900'
        : 'text-red-500 reward-glow'}">{formatEther(job.reward)} ETH</span
    >
  </div>

  <!-- Trust -->
  <div
    class="col-span-2 flex flex-col items-start md:items-center justify-center"
  >
    <span
      class="text-[10px] text-gray-600 md:hidden uppercase tracking-wider mb-1"
      >Trust</span
    >
    <span
      class="text-sm font-bold bg-white/5 px-3 py-1 {job.status ===
        'cancelled' || job.status === 'overdue'
        ? 'text-gray-500'
        : 'text-white'}">≥{job.minTrustScore}</span
    >
  </div>

  <!-- Deadline -->
  <div class="col-span-2 flex flex-col items-start md:items-end justify-center">
    <span
      class="text-[10px] text-gray-600 md:hidden uppercase tracking-wider mb-1"
      >Deadline</span
    >
    <span
      class="font-mono text-xs {formatDeadline(job.deadline) === 'EXPIRED'
        ? 'text-gray-600'
        : 'text-gray-400 group-hover:text-white'} transition-colors"
      >{formatDeadline(job.deadline)}</span
    >
  </div>
</a>

<style>
  .description-clamp {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .cyber-row {
    background-color: #030303;
    transition: all 0.2s ease-in-out;
  }
  .cyber-row:hover {
    background-color: #080808;
    transform: translateX(4px);
  }
  .status-bar-open {
    background-color: #ff2a2a;
    box-shadow: 0 0 20px rgba(255, 42, 42, 0.4);
  }
  .status-bar-done {
    background-color: #22c55e;
    box-shadow: 0 0 15px rgba(34, 197, 94, 0.3);
  }
  .status-bar-cancelled {
    background-color: #551111;
    opacity: 0.6;
  }
  .status-bar-progress {
    background-color: #ff6b6b;
    box-shadow: 0 0 15px rgba(255, 107, 107, 0.3);
  }
  .status-bar-overdue {
    background-color: #7c3400;
    opacity: 0.7;
  }
  .badge-cyber-open {
    font-size: 10px;
    font-weight: 700;
    color: #ff2a2a;
    border: 1px solid rgba(255, 42, 42, 0.3);
    padding: 2px 6px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    background-color: rgba(255, 42, 42, 0.05);
  }
  .badge-cyber-done {
    font-size: 10px;
    font-weight: 700;
    color: #4ade80;
    border: 1px solid rgba(74, 222, 128, 0.3);
    padding: 2px 6px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    background-color: rgba(74, 222, 128, 0.05);
  }
  .badge-cyber-cancelled {
    font-size: 10px;
    font-weight: 700;
    color: #6b7280;
    border: 1px solid #374151;
    padding: 2px 6px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .badge-cyber-progress {
    font-size: 10px;
    font-weight: 700;
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.3);
    padding: 2px 6px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    background-color: rgba(255, 255, 255, 0.05);
  }
  .badge-cyber-overdue {
    font-size: 10px;
    font-weight: 700;
    color: #f97316;
    border: 1px solid rgba(249, 115, 22, 0.3);
    padding: 2px 6px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    background-color: rgba(249, 115, 22, 0.05);
  }
  .reward-glow {
    text-shadow: 0 0 12px rgba(255, 42, 42, 0.6);
  }
</style>
