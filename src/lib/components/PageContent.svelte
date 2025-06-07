<script lang="ts">
  import { cn } from '$lib/utils/util';
  import type { Component, Snippet } from 'svelte';
  import type { ClassValue } from 'svelte/elements';

  type Props = {
    title?: string | Snippet;
    description?: string | Snippet;
    class?: ClassValue;
    small?: boolean;
    children: Snippet;
    docsComponent?: Component;
  };

  const {
    title,
    description,
    class: className,
    small = false,
    children,
    docsComponent
  }: Props = $props();

  const DocsComponent = docsComponent as Snippet | undefined;
</script>

<div class={small ? 'max-w-lg mx-auto min-h-full flex flex-col items-center justify-center' : ''}>
  {#if title || description}
    <div class="flex flex-col gap-2 w-full">
      {#if title}
        <div class="flex items-center gap-2">
          {#if typeof title === 'string'}
            <h2 class="max-xs:text-3xl text-4xl font-bold">{title}</h2>
          {:else}
            {@render title()}
          {/if}

          {@render DocsComponent?.()}
        </div>
      {/if}

      {#if description}
        {#if typeof description === 'string'}
          <p class="text-muted-foreground">{description}</p>
        {:else}
          {@render description()}
        {/if}
      {/if}
    </div>
  {/if}

  <div class={cn('flex flex-col gap-4 w-full', title || description ? 'mt-6' : '', className)}>
    {@render children()}
  </div>
</div>