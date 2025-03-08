<script lang="ts">
  import type { Snippet } from 'svelte';

  type Props = {
    title: string;
    description?: string;
    children: Snippet;
  };

  const { title, description, children }: Props = $props();
</script>

<div class="space-y-2">
  <div class="space-y-0.5">
    <h4 class="font-medium">{title}</h4>
    {#if description}
      <p class="text-sm text-muted-foreground">{description}</p>
    {/if}
  </div>

  {@render children()}
</div>