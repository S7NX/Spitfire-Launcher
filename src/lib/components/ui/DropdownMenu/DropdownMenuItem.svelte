<script lang="ts">
  import { cn } from '$lib/utils/util';
  import { DropdownMenu } from 'bits-ui';
  import type { Snippet } from 'svelte';

  type Props = DropdownMenu.ItemProps & {
    children: Snippet;
  };

  const {
    children,
    class: className,
    ...restProps
  }: Props = $props();
</script>

<DropdownMenu.Item
  {...restProps}
  class={cn(
    'flex items-center gap-2 w-full text-left px-4 py-2 text-sm truncate rounded-md data-disabled:opacity-50 data-disabled:cursor-not-allowed',
    'hover:bg-accent hover:cursor-pointer transition-colors',
    className
  )}
>
  {@render children()}
</DropdownMenu.Item>
