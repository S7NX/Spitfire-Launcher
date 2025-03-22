<script lang="ts">
  import { cn } from '$lib/utils';
  import { Label } from 'bits-ui';
  import type { Snippet } from 'svelte';

  type Props = {
    title: string;
    description?: string;
    class?: string;
    children: Snippet;
  };

  const { title, description, class: className, children }: Props = $props();
</script>

<div
  class={cn(
    'flex flex-row space-x-4 items-center justify-between',
    className
  )}
>
  <div class="space-y-0.5">
    <Label.Root class="font-medium">{title}</Label.Root>
    {#if description}
      <p class="text-sm text-muted-foreground">{description}</p>
    {/if}
  </div>

  <div class="flex items-center">
    {@render children()}
  </div>
</div>