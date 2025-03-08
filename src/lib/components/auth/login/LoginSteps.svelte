<script lang="ts">
  import { cn } from '$lib/utils';

  type Props = {
    steps: string[];
    currentStep: number;
  };

  const { steps, currentStep }: Props = $props();
</script>

<div class="relative mb-6 select-none">
  <div class="absolute left-0 top-4 h-1 w-full bg-muted/25">
    <div
      style="width: {(currentStep / (steps.length - 1) * 100) || 10}%"
      class="h-full bg-muted transition-all duration-500 ease-in-out"
    ></div>
  </div>

  <div class="relative flex justify-between">
    {#each steps as step, index (step)}
      <div class="flex flex-col items-center">
        <div
          class={cn(
            'z-10 flex size-8 items-center justify-center rounded-full border transition-all',
            index <= currentStep
              ? 'border-muted bg-accent text-accent-foreground'
              : 'border-muted bg-background text-muted-foreground'
          )}
        >
          {index + 1}
        </div>

        <span class="mt-2 text-xs {index <= currentStep ? 'text-foreground' : 'text-muted-foreground'}">
          {step}
        </span>
      </div>
    {/each}
  </div>
</div>
