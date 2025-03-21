<script lang="ts">
  import { Select, type WithoutChildren } from 'bits-ui';
  import CheckIcon from 'lucide-svelte/icons/check';
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils';
  import type { ClassValue } from 'svelte/elements';

  type Props = WithoutChildren<Select.RootProps> & {
    items: { label: string; value: string; disabled?: boolean }[];
    maxSelections?: number;
    contentProps?: WithoutChildren<Select.ContentProps>;
    trigger: Snippet<[label?: string]>;
    triggerClass?: ClassValue;
  };

  let {
    open = $bindable(false),
    value = $bindable(),
    items,
    maxSelections,
    contentProps,
    trigger,
    triggerClass,
    ...restProps
  }: Props = $props();

  const label = $derived.by(() => {
    const isSingleValue = typeof value === 'string' || (Array.isArray(value) && value.length === 1);

    if (isSingleValue) {
      const singleValue = Array.isArray(value) ? value[0] : value;
      return items.find((item) => item.value === singleValue)?.label;
    }
  });

  const reachedMaxSelections = $derived(maxSelections ? Array.isArray(value) && value.length >= maxSelections : false);

  $effect(() => {
    if (items.length === 1 && value) open = false;
  });
</script>

<Select.Root bind:open bind:value={value as never} {...restProps}>
  <Select.Trigger
    class={cn(
      'border p-2 rounded-lg flex items-center min-w-52 whitespace-nowrap overflow-hidden disabled:cursor-not-allowed disabled:opacity-50',
      triggerClass
    )}>
    {@render trigger(label)}
  </Select.Trigger>
  <Select.Portal>
    <Select.Content
      class={cn(
        'bg-background shadow-popover outline-hidden z-50 select-none rounded-xl border p-3',
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2',
        'data-[side=top]:slide-in-from-bottom-2 max-h-[var(--bits-select-content-available-height)] w-[var(--bits-select-anchor-width)] min-w-[var(--bits-select-anchor-width)]',
        'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1'
      )}
      sideOffset={10}
      {...contentProps}
    >
      <Select.Viewport>
        {#each items as item, i (i + item.value)}
          <Select.Item
            class="flex items-center py-2 pl-3 rounded-md cursor-pointer data-highlighted:bg-muted data-disabled:opacity-50 data-disabled:cursor-default"
            disabled={item.disabled || (reachedMaxSelections && value ? !value.includes(item.value) : false)}
            label={item.label}
            value={item.value}
          >
            {#snippet children({ selected })}
              {item.label}
              {#if selected}
                <div class="ml-auto">
                  <CheckIcon class="size-4 mr-3"/>
                </div>
              {/if}
            {/snippet}
          </Select.Item>
        {/each}
      </Select.Viewport>
    </Select.Content>
  </Select.Portal>
</Select.Root>