<script lang="ts">
  const { children } = $props();
</script>

<div class="flex flex-col items-center justify-center h-full">
  <div class="flex flex-col gap-4 w-96 p-5 border rounded-md">
    {@render children()}
  </div>
</div>