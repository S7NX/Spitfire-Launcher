<script lang="ts">
  import type { Snippet } from 'svelte';
  import { AlertDialog, type WithoutChild } from 'bits-ui';
  import type { ClassValue } from 'svelte/elements';
  import { cn } from '$lib/utils';

  type Props = AlertDialog.RootProps & {
    trigger?: Snippet;
    triggerClass?: ClassValue;
    title?: Snippet;
    description?: Snippet;
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
          'rounded-xl bg-background shadow-popover',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          'outline-hidden fixed left-[50%] top-[50%] z-50 w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] border p-6 sm:max-w-lg md:w-full'
        )}
      >
        <div class="flex flex-col gap-2 mb-3">
          {#if title}
            <AlertDialog.Title class="text-lg font-semibold tracking-tight">
              {@render title()}
            </AlertDialog.Title>
          {/if}

          {#if description}
            <AlertDialog.Description class="text-muted-foreground text-sm">
              {@render description()}
            </AlertDialog.Description>
          {/if}
        </div>

        {@render children?.()}
      </AlertDialog.Content>
    </AlertDialog.Portal>
  </AlertDialog.Root>
</div>