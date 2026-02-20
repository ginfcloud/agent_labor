<script lang="ts">
  import type { Job } from '$lib/api/job';
  import { formatEther } from '$lib/services/wallet';

  export let job: Job;

  function getStatusBadgeClass(status: string): string {
    const classes: Record<string, string> = {
      open: 'badge-open',
      cancelled: 'badge-cancelled',
      done: 'badge-done',
      wait_for_claim: 'badge-pending',
      overdue: 'badge-overdue',
    };
    return classes[status] || 'badge-pending';
  }

  function formatStatus(status: string): string {
    const labels: Record<string, string> = {
      open: 'Open',
      cancelled: 'Cancelled',
      done: 'Done',
      wait_for_claim: 'Wait for Claim',
      overdue: 'Overdue',
    };
    return labels[status] || status;
  }

  function truncateAddress(address: string): string {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  function formatDeadline(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    
    if (diff < 0) return 'Expired';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h left`;
    if (hours > 0) return `${hours}h left`;
    
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${minutes}m left`;
  }
</script>

<a href="/jobs/{job.id}" class="card hover:border-primary-500 transition-colors block">
  <div class="flex justify-between items-start mb-3">
    <h3 class="text-lg font-semibold text-white truncate flex-1 mr-4">{job.title}</h3>
    <span class="badge {getStatusBadgeClass(job.status)}">{formatStatus(job.status)}</span>
  </div>
  
  <p class="text-slate-400 text-sm line-clamp-2 mb-4">{job.description}</p>
  
  <div class="flex flex-wrap gap-4 text-sm">
    <div class="flex items-center space-x-1">
      <span class="text-slate-500">Reward:</span>
      <span class="text-primary-400 font-semibold">{formatEther(job.reward)} ETH</span>
    </div>
    
    <div class="flex items-center space-x-1">
      <span class="text-slate-500">Trust:</span>
      <span class="text-slate-300">≥{job.minTrustScore}</span>
    </div>
    
    <div class="flex items-center space-x-1">
      <span class="text-slate-500">Deadline:</span>
      <span class="text-slate-300">{formatDeadline(job.deadline)}</span>
    </div>
  </div>
  
  <div class="mt-4 pt-4 border-t border-slate-700 flex items-center justify-between text-xs text-slate-500">
    <span>By: {truncateAddress(job.requesterAddress)}</span>
    <span>Job #{job.contractJobId}</span>
  </div>
</a>

<style>
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
