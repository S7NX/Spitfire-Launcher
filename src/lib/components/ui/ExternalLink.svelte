<script lang="ts">
  import { openUrl } from '@tauri-apps/plugin-opener';
  import type { Snippet } from 'svelte';
  import type { HTMLAnchorAttributes } from 'svelte/elements';

  type ElementProps = HTMLAnchorAttributes & {
    href: string;
    children: Snippet;
  };

  const {
    href,
    children,
    ...restProps
  }: ElementProps = $props();
</script>

<a
  onclick={() => openUrl(href)}
  {...restProps}
>
  {@render children()}
</a>