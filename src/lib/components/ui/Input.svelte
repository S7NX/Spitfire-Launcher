<script lang="ts">
  import { tv, type VariantProps } from 'tailwind-variants';
  import type { HTMLInputAttributes } from 'svelte/elements';

  const inputVariants = tv({
    base:
      'w-full px-4 py-2 text-sm rounded-md transition-all border border-input appearance-none disabled:opacity-50 focus:ring-offset-background focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-foreground',
    variants: {
      variant: {
        primary: 'bg-background text-background-foreground',
        secondary: 'bg-secondary text-secondary-foreground',
        outline: 'bg-transparent text-input-foreground border-input',
        ghost: 'bg-transparent text-input-foreground border-none',
        disabled: 'bg-input-disabled text-input-disabled-foreground hover:cursor-not-allowed'
      }
    },
    defaultVariants: {
      variant: 'primary'
    }
  });

  type InputProps = HTMLInputAttributes & VariantProps<typeof inputVariants>;

  let {
    class: className,
    variant,
    value = $bindable<string>(),
    ...restProps
  }: InputProps = $props();
</script>

<input
  {...restProps}
  class={[inputVariants({ variant }), className]}
  spellcheck="false"
  bind:value
/>
