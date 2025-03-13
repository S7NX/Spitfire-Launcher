<script lang="ts">
  import type { ClassValue } from 'svelte/elements';
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils';

  type Props = {
    class?: ClassValue;
    children: Snippet;
  };

  const { class: className, children }: Props = $props();
</script>

<div class="flex flex-col items-center justify-center h-full">
  <div class={cn('flex flex-col gap-4 w-96 p-5 border rounded-md', className)}>
    {@render children()}
  </div>
</div>