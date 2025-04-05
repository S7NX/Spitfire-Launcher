<script lang="ts">
  import { cn } from '$lib/utils';
  import type { Snippet } from 'svelte';
  import type { HTMLLabelAttributes } from 'svelte/elements';

  type Props = HTMLLabelAttributes & {
    children: Snippet;
  };

  const {
    children,
    class: className,
    ...restProps
  }: Props = $props();
</script>

<label
  {...restProps}
  class={cn(
    'font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
    className
  )}
>
  {@render children()}
</label>