<script generics="T" lang="ts">
  import { Accordion, type WithoutChildrenOrChild } from 'bits-ui';
  import type { Snippet } from 'svelte';

  type Props = WithoutChildrenOrChild<Accordion.ItemProps> & {
    type: 'single' | 'multiple';
    items: T[];
    trigger: Snippet<[T]>;
    content: Snippet<[T]>;
  };

  let { type, items, trigger, content, ...restProps }: Props = $props();
</script>

<Accordion.Root {type}>
  {#each items as item, index (index.toString())}
    <Accordion.Item {...restProps}
    >
      <Accordion.Header>
        <Accordion.Trigger class="w-full transition-all [&[data-state=open]_.lucide-chevron-down]:rotate-180">
          {@render trigger(item)}
        </Accordion.Trigger>
      </Accordion.Header>

      <Accordion.Content class="data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down overflow-hidden">
        {@render content(item)}
      </Accordion.Content>
    </Accordion.Item>
  {/each}
</Accordion.Root>