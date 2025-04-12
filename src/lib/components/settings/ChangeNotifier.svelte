<script lang="ts">
  import { fly } from 'svelte/transition';
  import { cn } from '$lib/utils/util';
  import Button from '$components/ui/Button.svelte';
  import CheckIcon from 'lucide-svelte/icons/check';
  import XIcon from 'lucide-svelte/icons/x';
  import { t } from '$lib/utils/util';

  type Props = {
    visible: boolean;
    onSave: () => void;
    onReset: () => void;
    className?: string;
  };

  const { visible, onSave, onReset, className }: Props = $props();
</script>

{#if visible}
  <div
    class={cn(
      'fixed bottom-4 left-1/2 -translate-x-1/2 bg-card border border-border shadow-lg rounded-lg p-4 flex items-center gap-4 z-50 whitespace-nowrap',
      className
    )}
    transition:fly={{ y: 20, duration: 300 }}
  >
    <span class="text-sm">{$t('settings.unsavedChanges.description')}</span>
    <div class="flex items-center gap-2">
      <Button
        class="flex items-center gap-2 h-8"
        onclick={onReset}
        size="sm"
        variant="outline"
      >
        <XIcon class="size-4" />
        {$t('settings.unsavedChanges.reset')}
      </Button>

      <Button class="flex items-center gap-2 h-8" onclick={onSave} size="sm">
        <CheckIcon class="size-4" />
        {$t('settings.unsavedChanges.save')}
      </Button>
    </div>
  </div>
{/if}
