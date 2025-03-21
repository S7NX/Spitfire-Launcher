<script lang="ts">
  import { Tooltip } from 'bits-ui';
  import { type Snippet } from 'svelte';
  import { cn } from '$lib/utils';

  type Props = Tooltip.RootProps & {
    children: Snippet;
    tooltip: Snippet | string;
  };

  let {
    open = $bindable(false),
    children,
    tooltip
  }: Props = $props();
</script>

<Tooltip.Root delayDuration={200} bind:open>
  <Tooltip.Trigger>
    {@render children()}
  </Tooltip.Trigger>
  <Tooltip.Portal>
    <Tooltip.Content
      class={cn(
        'border border-input bg-background hover:bg-muted',
        'focus-visible:ring-foreground focus-visible:ring-offset-background focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2',
        'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm'
      )}
      sideOffset={0}>
      {#if typeof tooltip === 'string'}
        {tooltip}
      {:else}
        {@render tooltip()}
      {/if}
      <Tooltip.Arrow class="text-border"/>
    </Tooltip.Content>
  </Tooltip.Portal>
</Tooltip.Root>