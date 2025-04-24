<script lang="ts">
  import type { Snippet } from 'svelte';
  import { DropdownMenu, type WithoutChild } from 'bits-ui';
  import { cn } from '$lib/utils/util';
  import { slide } from 'svelte/transition';
  import { cubicInOut } from 'svelte/easing';
  import type { ClassValue } from 'svelte/elements';

  type Props = DropdownMenu.RootProps & {
    trigger?: Snippet;
    triggerClass?: ClassValue;
    contentProps?: WithoutChild<DropdownMenu.ContentProps>;
  };

  let {
    open = $bindable(false),
    children,
    trigger,
    triggerClass,
    contentProps,
    ...restProps
  }: Props = $props();
</script>

<DropdownMenu.Root {...restProps} bind:open>
  {#if trigger}
    <DropdownMenu.Trigger
      class={cn(
        'inline-flex items-center justify-center transition-colors',
        'focus-visible:ring-foreground focus-visible:ring-offset-background focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.98]',
        triggerClass
      )}
    >
      {@render trigger()}
    </DropdownMenu.Trigger>
  {/if}

  <DropdownMenu.Portal>
    <DropdownMenu.Content
      {...contentProps}
      class={cn(
        'border-muted bg-background shadow-popover outline-hidden rounded-lg border p-1',
        'w-[var(--bits-dropdown-menu-anchor-width)] min-w-60 max-h-[var(--bits-dropdown-menu-content-available-height)] overflow-hidden',
        contentProps?.class
      )}
      forceMount={true}
      sideOffset={8}
    >
      {#snippet child({ wrapperProps, props, open })}
        {#if open}
          <div {...wrapperProps}>
            <div {...props} transition:slide|local={{ duration: 150, easing: cubicInOut }}>
              {@render children?.()}
            </div>
          </div>
        {/if}
      {/snippet}
    </DropdownMenu.Content>
  </DropdownMenu.Portal>
</DropdownMenu.Root>