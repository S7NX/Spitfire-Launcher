<script lang="ts">
  import Dialog from '$components/ui/Dialog.svelte';
  import HelpCircleIcon from 'lucide-svelte/icons/help-circle';
  import type { Snippet } from 'svelte';

  type Props = {
    children: Snippet;
  };

  const { children }: Props = $props();
</script>

<Dialog>
  {#snippet trigger()}
    <HelpCircleIcon class="text-muted-foreground hover:text-foreground transition-colors size-5"/>
  {/snippet}

  <div class="prose dark:prose-invert prose-sm">
    {@render children()}
  </div>
</Dialog>