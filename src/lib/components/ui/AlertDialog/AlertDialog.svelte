<script lang="ts">
  import type { Snippet } from 'svelte';
  import { AlertDialog, type WithoutChild } from 'bits-ui';
  import type { ClassValue } from 'svelte/elements';
  import { cn } from '$lib/utils/util';

  type Props = AlertDialog.RootProps & {
    trigger?: Snippet;
    triggerClass?: ClassValue;
    title?: string | Snippet;
    description?: string | Snippet;
    contentProps?: WithoutChild<AlertDialog.ContentProps>;
  };

  let {
    open = $bindable(false),
    children,
    trigger,
    triggerClass,
    contentProps,
    title,
    description,
    ...restProps
  }: Props = $props();
</script>

<div class="contents">
  <AlertDialog.Root {...restProps} bind:open>
    {#if trigger}
      <AlertDialog.Trigger
        class={cn(
          'transition-colors',
          'focus-visible:ring-foreground focus-visible:ring-offset-background focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.98]',
          'inline-flex items-center justify-center',
          triggerClass
        )}
      >
        {@render trigger()}
      </AlertDialog.Trigger>
    {/if}
    <AlertDialog.Portal>
      <AlertDialog.Overlay
        class={cn(
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          'fixed inset-0 z-50 bg-black/80'
        )}
      />
      <AlertDialog.Content
        {...contentProps}
        class={cn(
          'bg-background border rounded-xl p-6 shadow-popover z-50 max-w-[calc(100%-2rem)] sm:max-w-lg w-full',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          'outline-hidden fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%]'
        )}
      >
        <div class="flex flex-col gap-2 mb-3">
          {#if title}
            <AlertDialog.Title class="text-lg font-semibold tracking-tight">
              {#if typeof title === 'string'}
                {title}
              {:else}
                {@render title()}
              {/if}
            </AlertDialog.Title>
          {/if}

          {#if description}
            <AlertDialog.Description class="text-muted-foreground text-sm">
              {#if typeof description === 'string'}
                {description}
              {:else}
                {@render description()}
              {/if}
            </AlertDialog.Description>
          {/if}
        </div>

        {@render children?.()}
      </AlertDialog.Content>
    </AlertDialog.Portal>
  </AlertDialog.Root>
</div>