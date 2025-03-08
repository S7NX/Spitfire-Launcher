<script lang="ts">
  import type { Snippet } from 'svelte';
  import { DropdownMenu, type WithoutChild } from 'bits-ui';
  import { cn } from '$lib/utils';
  import type { ClassValue } from 'svelte/elements';

  type Props = DropdownMenu.ContentProps & {
    // open doesnt exist in DropdownMenu.ContentProps
    open?: boolean;
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
        'transition-colors',
        'focus-visible:ring-foreground focus-visible:ring-offset-background focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.98]',
        'inline-flex items-center justify-center',
        triggerClass
      )}
    >
      {@render trigger()}
    </DropdownMenu.Trigger>
  {/if}
  <DropdownMenu.Portal>
    <DropdownMenu.Content
      {...contentProps}
      class="focus-override border-muted bg-background shadow-popover outline-hidden w-60 rounded-xl border px-1 py-1.5"
      sideOffset={8}
    >
      {@render children?.()}
    </DropdownMenu.Content>
  </DropdownMenu.Portal>
</DropdownMenu.Root>