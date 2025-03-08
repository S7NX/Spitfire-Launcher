<script lang="ts">
  import { cn } from '$lib/utils';
  import { Separator } from 'bits-ui';
  import type { Snippet } from 'svelte';

  type Props = {
    title: string;
    description?: string;
    className?: string;
    children: Snippet;
  };

  const { title, description, className, children }: Props = $props();
</script>

<div class={cn('space-y-4', className)}>
  <div>
    <h3 class="text-lg font-medium">{title}</h3>
    {#if description}
      <p class="text-sm text-muted-foreground">{description}</p>
    {/if}
  </div>

  <Separator.Root/>

  <div class="space-y-1">
    {@render children()}
  </div>
</div>