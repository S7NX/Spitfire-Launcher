<script lang="ts">
  import { Separator } from 'bits-ui';
  import type { ClassValue } from 'svelte/elements';
  import type { Component, Snippet } from 'svelte';
  import { cn } from '$lib/utils/util';

  type Props = {
    title?: string | Snippet;
    description?: string | Snippet;
    class?: ClassValue;
    children: Snippet;
    docsComponent?: Component;
  };

  const {
    title,
    description,
    class: className,
    children,
    docsComponent
  }: Props = $props();

  const DocsComponent = docsComponent as Snippet | undefined;
</script>

<div class="flex items-center justify-center min-h-full">
  <div
    class={cn(
      'flex flex-col gap-4 xxs:w-80 xs:w-96 p-5 border rounded-md',
      className
    )}
  >
    {#if title || description}
      <div class="flex flex-col gap-2">
        {#if title}
          <div class="flex items-center gap-2">
            {#if typeof title === 'string'}
              <h2 class="text-lg font-medium">{title}</h2>
            {:else}
              {@render title()}
            {/if}

            {@render DocsComponent?.()}
          </div>
        {/if}

        {#if description}
          {#if typeof description === 'string'}
            <p class="text-sm text-muted-foreground">{description}</p>
          {:else}
            {@render description()}
          {/if}
        {/if}
      </div>

      <Separator.Root class="bg-border h-px -mx-5"/>
    {/if}

    {@render children()}
  </div>
</div>