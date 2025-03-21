<script lang="ts">
  import { Separator } from 'bits-ui';
  import type { ClassValue } from 'svelte/elements';
  import type { Snippet } from 'svelte';

  type Props = {
    title?: string;
    description?: string;
    class?: ClassValue;
    children: Snippet;
  };

  const { title, description, class: className, children }: Props = $props();
</script>

<div class="flex flex-col items-center justify-center min-h-full">
  <div class={['flex flex-col gap-4 xxs:w-80 xs:w-96 p-5 border rounded-md', className]}>
    {#if title || description}
      <div class="flex flex-col gap-2">
        {#if title}
          <h2 class="text-lg font-medium">{title}</h2>
        {/if}

        {#if description}
          <p class="text-sm text-muted-foreground">{description}</p>
        {/if}
      </div>

      <Separator.Root class="bg-border h-px -mx-5"/>
    {/if}

    {@render children()}
  </div>
</div>