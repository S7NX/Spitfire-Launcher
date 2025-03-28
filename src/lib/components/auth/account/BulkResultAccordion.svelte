<script generics="T" lang="ts">
  import Accordion from '$components/ui/Accordion.svelte';
  import ChevronDownIcon from 'lucide-svelte/icons/chevron-down';
  import type { Snippet } from 'svelte';
  import type { BulkActionStatus } from '$types/accounts';

  type Props = {
    statuses: BulkActionStatus<T>[];
    content: Snippet<[BulkActionStatus<T>]>;
  };

  const { statuses, content: accordionContent }: Props = $props();
</script>

<Accordion 
  class="border rounded-lg mt-4 group"
  items={statuses}
  openItems={statuses.length === 1 ? [0] : undefined}
  type="multiple"
>
  {#snippet trigger(status)}
    <div class="flex items-center justify-between px-3 py-2 bg-muted rounded-lg border-b group-data-[state=open]:rounded-b-none">
      <span class="font-semibold truncate">{status.displayName}</span>

      <span class="hover:bg-muted-foreground/10 flex size-8 items-center justify-center rounded-md transition-colors">
        <ChevronDownIcon class="size-5 transition-transform duration-200"/>
      </span>
    </div>
  {/snippet}

  {#snippet content(status)}
    <div class="bg-muted/30">
      {@render accordionContent(status)}
    </div>
  {/snippet}
</Accordion>