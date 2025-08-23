<script lang="ts">
  import { cn } from '$lib/utils/util';
  import { Pagination } from 'bits-ui';
  import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';

  type Props = Pagination.RootProps;

  let {
    page = $bindable(1),
    ...restProps
  }: Props = $props();

  const paginationButtonClasses = cn(
    'size-8 flex items-center justify-center rounded-md [&>svg]:size-6',
    'bg-transparent text-primary transition-colors active:scale-[0.98]',
    'disabled:cursor-not-allowed disabled:opacity-50',
    'hover:bg-muted hover:disabled:bg-transparent'
  );
</script>

<Pagination.Root bind:page {...restProps}>
  {#snippet children({ pages })}
    <div class="flex items-center gap-3">
      <Pagination.PrevButton class={paginationButtonClasses}>
        <ChevronLeftIcon/>
      </Pagination.PrevButton>

      <div class="flex items-center gap-2.5">
        {#each pages as page (page.key)}
          {#if page.type === 'ellipsis'}
            <div class="select-none text-muted-foreground font-medium">
              ...
            </div>
          {:else}
            <Pagination.Page
              class={cn(
                paginationButtonClasses,
                'font-medium data-selected:bg-foreground data-selected:text-background'
              )}
              {page}
            >
              {page.value}
            </Pagination.Page>
          {/if}
        {/each}
      </div>

      <Pagination.NextButton class={paginationButtonClasses}>
        <ChevronRightIcon/>
      </Pagination.NextButton>
    </div>
  {/snippet}
</Pagination.Root>