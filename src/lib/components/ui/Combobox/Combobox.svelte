<script lang="ts">
  import { Combobox, type WithoutChildrenOrChild } from 'bits-ui';
  import ChevronsDownIcon from 'lucide-svelte/icons/chevrons-down';
  import ChevronsUpIcon from 'lucide-svelte/icons/chevrons-up';
  import ChevronsUpDownIcon from 'lucide-svelte/icons/chevrons-up-down';
  import CheckIcon from 'lucide-svelte/icons/check';
  import SearchIcon from 'lucide-svelte/icons/search';
  import { cn } from '$lib/utils/util';

  type Item = { value: string; label: string };

  type Props = Combobox.RootProps & {
    items: Item[];
    placeholder?: string;
    inputProps?: WithoutChildrenOrChild<Combobox.InputProps>;
    contentProps?: WithoutChildrenOrChild<Combobox.ContentProps>;
    icon: any;
  };

  let {
    type,
    items,
    placeholder,
    value = $bindable(),
    open = $bindable(false),
    inputProps,
    contentProps,
    icon,
    ...restProps
  }: Props = $props();

  let searchValue = $state('');
  let customAnchor = $state<HTMLElement>();

  const filteredItems = $derived.by(() => {
    if (!searchValue) return items;
    return items.filter((item) => item.label.toLowerCase().includes(searchValue.toLowerCase()));
  });

  function handleInput(e: Event & { currentTarget: HTMLInputElement }) {
    searchValue = e.currentTarget.value;
  }

  function handleOpenChange(newOpen: boolean) {
    if (!newOpen) searchValue = '';
  }
</script>

<Combobox.Root onOpenChange={handleOpenChange} type={type as never} bind:value={value as never} bind:open {...restProps}>
  {@const Icon = icon}
  <Combobox.Trigger class="flex w-full items-center peer disabled:cursor-not-allowed disabled:opacity-50">
    <div
      bind:this={customAnchor}
      class={cn(
        'rounded-lg bg-background inline-flex items-center text-muted-foreground w-full truncate border px-2 transition-colors h-11',
        'focus:ring-foreground focus:ring-offset-background focus:outline-hidden focus:ring-2 focus:ring-offset-2'
      )}
    >
      <Icon class="size-5"/>
      <span class="ml-2">{placeholder || 'Select items'}</span>
      <ChevronsUpDownIcon class="text-muted-foreground size-5 ml-auto"/>
    </div>
  </Combobox.Trigger>

  <Combobox.Portal>
    <Combobox.Content
      class={cn(
        'bg-background shadow-popover outline-hidden z-50 select-none rounded-xl border p-1',
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
        'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
        'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1',
        'w-[var(--bits-combobox-anchor-width)] min-w-[var(--bits-combobox-anchor-width)] max-h-[var(--bits-combobox-content-available-height)]'
      )}
      {customAnchor}
      sideOffset={10}
      {...contentProps}
    >
      <Combobox.ScrollUpButton class="flex w-full items-center justify-center">
        <ChevronsUpIcon class="size-3"/>
      </Combobox.ScrollUpButton>

      <Combobox.Viewport class="flex flex-col p-1">
        <div class="flex items-center border-b mb-1 p-2 gap-2">
          <SearchIcon class="text-muted-foreground size-5"/>
          <Combobox.Input
            placeholder="Search..."
            {...inputProps}
            class={cn(
              'w-full text-sm bg-transparent grow focus:outline-none',
              inputProps?.class
            )}
            oninput={handleInput}
          />
        </div>

        {#each filteredItems as item, i (i + item.value)}
          <Combobox.Item
            class="rounded-md outline-hidden flex h-10 w-full select-none items-center pl-3 text-sm cursor-pointer truncate data-highlighted:bg-muted data-disabled:opacity-50 data-disabled:cursor-default"
            label={item.label}
            value={item.value}
          >
            {#snippet children({ selected })}
              <span class="truncate">{item.label}</span>
              {#if selected}
                <div class="ml-auto">
                  <CheckIcon class="size-4 mr-3"/>
                </div>
              {/if}
            {/snippet}
          </Combobox.Item>
        {:else}
          <span class="block px-5 py-2 text-sm text-muted-foreground">
            No results found
          </span>
        {/each}
      </Combobox.Viewport>

      <Combobox.ScrollDownButton class="flex w-full items-center justify-center">
        <ChevronsDownIcon class="size-3"/>
      </Combobox.ScrollDownButton>
    </Combobox.Content>
  </Combobox.Portal>
</Combobox.Root>