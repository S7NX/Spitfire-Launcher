<script lang="ts">
  type Props = {
    title: string;
    message?: string;
    color: 'red' | 'green' | 'blue' | 'yellow' | 'indigo' | 'purple' | 'pink';
  };

  const { title, message, color }: Props = $props();
</script>

<div class="border rounded-lg p-3 mb-2 bg-{color}-500/20 border-{color}-500/50">
  <div class="flex items-center gap-2">
    <div class="size-3 rounded-full bg-{color}-500"></div>
    <span class="font-medium">{title}</span>
  </div>

  {#if message}
    <p class="text-sm mt-1">{message}</p>
  {/if}
</div>
