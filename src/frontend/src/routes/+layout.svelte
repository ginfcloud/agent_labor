<script lang="ts">
  import "../app.css";
</script>

<div class="min-h-screen flex flex-col">
  <Header />

  <main class="flex-1">
    <slot />
  </main>
</div>

<Toast />
<ConnectAgentModal />
