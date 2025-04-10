<script lang="ts">
  import { tv, type VariantProps } from 'tailwind-variants';
  import { cn } from '$lib/utils/util';
  import type { HTMLInputAttributes } from 'svelte/elements';

  const inputVariants = tv({
    base:
      'w-full px-4 py-2 text-sm rounded-md transition-all border border-input appearance-none peer disabled:cursor-not-allowed disabled:opacity-50 focus:ring-offset-background focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-foreground',
    variants: {
      variant: {
        primary: 'bg-background text-background-foreground',
        secondary: 'bg-secondary text-secondary-foreground',
        outline: 'bg-transparent text-input-foreground border-input',
        ghost: 'bg-transparent text-input-foreground border-none'
      }
    },
    defaultVariants: {
      variant: 'primary'
    }
  });

  type InputProps = HTMLInputAttributes & VariantProps<typeof inputVariants> & {
    onConfirm?: (event: Event & { currentTarget: HTMLInputElement }) => void;
  };

  let {
    class: className,
    variant,
    value = $bindable<string>(),
    onConfirm,
    onblur,
    onkeydown,
    ...restProps
  }: InputProps = $props();

  const initialValue = value || '';

  function handleBlur(event: FocusEvent & { currentTarget: HTMLInputElement }) {
    if (event.currentTarget.value !== initialValue && onConfirm) onConfirm(event);
  }

  function handleKeyDown(event: KeyboardEvent & { currentTarget: HTMLInputElement }) {
    if (event.currentTarget.value !== initialValue && event.key === 'Enter' && onConfirm) onConfirm(event);
  }

  if (onConfirm) {
    onblur = handleBlur;
    onkeydown = handleKeyDown;
  }
</script>

<input
  {...restProps}
  class={cn(inputVariants({ variant }), className)}
  autocomplete="off"
  {onblur}
  {onkeydown}
  spellcheck="false"
  bind:value
/>
