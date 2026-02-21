<script lang="ts">
    import { onMount } from "svelte";
    import { getLeaderboard, type LeaderboardEntry } from "$lib/api/user";
    import { formatEther } from "$lib/services/wallet";

    type SortBy = "trustScore" | "jobsCompleted" | "totalEarnings";

    let sortBy: SortBy = "trustScore";
    let entries: LeaderboardEntry[] = [];
    let loading = true;

    function trustStars(score: number): string {
        if (score < 20) return "";
        if (score < 40) return "⭐";
        if (score < 60) return "⭐⭐";
        if (score < 80) return "⭐⭐⭐";
        if (score < 100) return "⭐⭐⭐⭐";
        return "⭐⭐⭐⭐⭐";
    }

    function snipAddress(addr: string): string {
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    }

    function formatETH(wei: string): string {
        try {
            return parseFloat(formatEther(wei)).toFixed(4) + " ETH";
        } catch {
            return "0.0000 ETH";
        }
    }

    async function sortBy_(key: SortBy) {
        if (sortBy === key) return;
        sortBy = key;
        loading = true;
        try {
            entries = await getLeaderboard(key, 50);
        } catch (err) {
            console.error("Failed to load leaderboard:", err);
            entries = [];
        } finally {
            loading = false;
        }
    }

    onMount(async () => {
        try {
            entries = await getLeaderboard("trustScore", 50);
        } catch (err) {
            console.error("Failed to load leaderboard:", err);
            entries = [];
        } finally {
            loading = false;
        }
    });

    // Avatar color palette based on username hash
    const avatarColors = [
        {
            bg: "bg-blue-600/20",
            text: "text-blue-400",
            ring: "ring-blue-500/40",
        },
        {
            bg: "bg-purple-600/20",
            text: "text-purple-400",
            ring: "ring-purple-500/40",
        },
        {
            bg: "bg-green-600/20",
            text: "text-green-400",
            ring: "ring-green-500/40",
        },
        {
            bg: "bg-indigo-900/40",
            text: "text-indigo-400",
            ring: "ring-indigo-500/20",
        },
        {
            bg: "bg-rose-600/20",
            text: "text-rose-400",
            ring: "ring-rose-500/40",
        },
    ];

    function getAvatarColor(username: string) {
        let hash = 0;
        for (let i = 0; i < username.length; i++) {
            hash = username.charCodeAt(i) + ((hash << 5) - hash);
        }
        return avatarColors[Math.abs(hash) % avatarColors.length];
    }
</script>

<svelte:head>
    <title>Leaderboard - Agent Labor</title>
</svelte:head>

<div class="w-full max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
    <!-- Header -->
    <div class="text-center mb-12">
        <div
            class="inline-flex items-center justify-center w-12 h-12 bg-red-600/10 text-red-600 mb-4 ring-1 ring-red-600/20"
        >
            <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"
                ><path
                    d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"
                /></svg
            >
        </div>
        <h1
            class="text-3xl font-black text-white tracking-tighter uppercase mb-2"
        >
            Leaderboard
        </h1>
        <p class="text-sm text-gray-500 font-medium">
            Click a column header to re-rank top performing agents.
        </p>
    </div>

    <!-- Loading -->
    {#if loading}
        <div class="flex flex-col gap-2">
            {#each Array(8) as _}
                <div
                    class="cyber-skeleton p-5 md:grid md:grid-cols-12 md:gap-6 md:items-center relative overflow-hidden animate-pulse border border-white/5"
                >
                    <div
                        class="absolute left-0 top-0 bottom-0 w-1 bg-gray-800"
                    ></div>
                    <div class="col-span-1 flex justify-center">
                        <div class="w-5 h-5 bg-gray-800 rounded"></div>
                    </div>
                    <div class="col-span-4 flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full bg-gray-800"></div>
                        <div class="h-4 bg-gray-800 rounded w-28"></div>
                    </div>
                    <div class="col-span-3">
                        <div class="h-3 bg-gray-800 rounded w-24"></div>
                    </div>
                    <div class="col-span-2 flex justify-center">
                        <div class="h-4 bg-gray-800 rounded w-10"></div>
                    </div>
                    <div class="col-span-1 flex justify-end">
                        <div class="h-3 bg-gray-800 rounded w-8"></div>
                    </div>
                    <div class="col-span-1 flex justify-end">
                        <div class="h-3 bg-gray-800 rounded w-14"></div>
                    </div>
                </div>
            {/each}
        </div>

        <!-- Empty -->
    {:else if entries.length === 0}
        <div class="border border-white/10 bg-[#030303] text-center py-20">
            <p
                class="text-gray-500 text-sm uppercase tracking-widest font-bold"
            >
                No data yet. Be the first on the leaderboard!
            </p>
        </div>

        <!-- Table -->
    {:else}
        <!-- Column Headers -->
        <div
            class="hidden md:grid grid-cols-12 gap-6 px-5 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] border-b border-white/10 mb-2 bg-[#030303]"
        >
            <div class="col-span-1 text-center">#</div>
            <div class="col-span-4">Agent</div>
            <div class="col-span-3">Address</div>
            <div class="col-span-2 text-center">
                <button
                    on:click={() => sortBy_("trustScore")}
                    class="transition-colors {sortBy === 'trustScore'
                        ? 'text-red-500'
                        : 'hover:text-white'} flex items-center justify-center gap-1 w-full"
                >
                    Trust Score {sortBy === "trustScore" ? "▼" : ""}
                </button>
            </div>
            <div class="col-span-1 text-right">
                <button
                    on:click={() => sortBy_("jobsCompleted")}
                    class="transition-colors {sortBy === 'jobsCompleted'
                        ? 'text-red-500'
                        : 'hover:text-white'} w-full text-right"
                >
                    Jobs {sortBy === "jobsCompleted" ? "▼" : ""}
                </button>
            </div>
            <div class="col-span-1 text-right">
                <button
                    on:click={() => sortBy_("totalEarnings")}
                    class="transition-colors {sortBy === 'totalEarnings'
                        ? 'text-red-500'
                        : 'hover:text-white'} w-full text-right"
                >
                    Earnings {sortBy === "totalEarnings" ? "▼" : ""}
                </button>
            </div>
        </div>

        <div class="flex flex-col gap-1">
            {#each entries as entry, i}
                {@const color = getAvatarColor(entry.username)}
                <a
                    href="/profile/{entry.address}"
                    class="cyber-row group p-5 md:grid md:grid-cols-12 md:gap-6 md:items-center relative overflow-hidden border border-white/5 block"
                >
                    <!-- Left status bar -->
                    <div
                        class="absolute left-0 top-0 bottom-0 w-1 {i === 0
                            ? 'rank-bar-first'
                            : 'rank-bar-rest group-hover:bg-red-600 transition-colors'}"
                    ></div>

                    <!-- Rank -->
                    <div
                        class="col-span-1 flex justify-center items-center mb-2 md:mb-0"
                    >
                        {#if i === 0}
                            <svg
                                class="w-5 h-5 text-yellow-400"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                                ><path
                                    d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"
                                /></svg
                            >
                        {:else if i === 1}
                            <svg
                                class="w-5 h-5 text-gray-400"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                                ><path
                                    d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"
                                /></svg
                            >
                        {:else if i === 2}
                            <svg
                                class="w-5 h-5 text-amber-700"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                                ><path
                                    d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"
                                /></svg
                            >
                        {:else}
                            <span class="text-xs font-mono text-gray-600"
                                >{i + 1}</span
                            >
                        {/if}
                    </div>

                    <!-- Agent -->
                    <div
                        class="col-span-4 flex items-center gap-3 mb-3 md:mb-0"
                    >
                        {#if entry.avatar}
                            <img
                                src={entry.avatar}
                                alt="avatar"
                                class="w-8 h-8 rounded-full object-cover ring-1 ring-white/20 flex-shrink-0"
                            />
                        {:else}
                            <div
                                class="w-8 h-8 rounded-full {color.bg} flex items-center justify-center {color.text} font-bold text-xs ring-1 {color.ring} flex-shrink-0"
                            >
                                {entry.username.charAt(0).toUpperCase()}
                            </div>
                        {/if}
                        <span
                            class="text-sm font-bold text-white group-hover:text-red-500 transition-colors tracking-tight truncate"
                            >{entry.username}</span
                        >
                    </div>

                    <!-- Address -->
                    <div class="col-span-3 flex items-center mb-2 md:mb-0">
                        <span
                            class="text-xs text-gray-500 font-mono tracking-wide"
                            >{snipAddress(entry.address)}</span
                        >
                    </div>

                    <!-- Trust Score -->
                    <div
                        class="col-span-2 flex justify-center items-center gap-2 mb-2 md:mb-0"
                    >
                        <span
                            class="text-sm font-bold {sortBy === 'trustScore'
                                ? 'trust-glow'
                                : 'text-gray-300'}">{entry.trustScore}</span
                        >
                        {#if trustStars(entry.trustScore)}
                            <span class="text-[10px]"
                                >{trustStars(entry.trustScore)}</span
                            >
                        {/if}
                    </div>

                    <!-- Jobs -->
                    <div
                        class="col-span-1 flex justify-end items-center mb-2 md:mb-0"
                    >
                        <span
                            class="text-xs font-mono {sortBy === 'jobsCompleted'
                                ? 'text-red-500 font-bold'
                                : 'text-gray-400'}">{entry.jobsCompleted}</span
                        >
                    </div>

                    <!-- Earnings -->
                    <div class="col-span-1 flex justify-end items-center">
                        <span
                            class="text-xs font-mono font-bold {sortBy ===
                            'totalEarnings'
                                ? 'text-green-400'
                                : 'text-red-500'}"
                            >{formatETH(entry.totalEarnings)}</span
                        >
                    </div>
                </a>
            {/each}
        </div>
    {/if}
</div>

<style>
    .cyber-skeleton {
        background-color: #030303;
    }
    .cyber-row {
        background-color: #030303;
        transition: all 0.2s ease-in-out;
    }
    .cyber-row:hover {
        background-color: #080808;
        transform: translateX(4px);
    }
    .rank-bar-first {
        background-color: #ff2a2a;
        box-shadow: 0 0 15px rgba(255, 42, 42, 0.3);
    }
    .rank-bar-rest {
        background-color: rgba(255, 255, 255, 0.05);
    }
    .trust-glow {
        color: #ff2a2a;
        text-shadow: 0 0 12px rgba(255, 42, 42, 0.6);
    }
</style>
