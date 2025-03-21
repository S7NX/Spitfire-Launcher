<script lang="ts">
  import { tv, type VariantProps } from 'tailwind-variants';
  import type { Snippet } from 'svelte';
  import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';

  const buttonVariants = tv({
    base: 'px-4 py-2 rounded-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed',
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground hover:bg-primary/80',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        accent: 'bg-accent text-accent-foreground hover:bg-accent/80',
        outline: 'border border-input bg-transparent hover:bg-input/40',
        ghost: 'bg-transparent hover:bg-input/40',
        danger: 'bg-destructive text-destructive-foreground hover:bg-destructive/80',
        epic: 'bg-epic text-epic-secondary hover:bg-epic/80'
      },
      size: {
        sm: 'px-2 py-1 text-sm font-normal',
        md: 'px-4 py-2 text-base font-medium',
        lg: 'px-6 py-3 text-lg font-bold'
      }
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md'
    }
  });

  type ElementProps = HTMLButtonAttributes & HTMLAnchorAttributes & VariantProps<typeof buttonVariants> & {
    children: Snippet;
    href?: string;
  };

  const { class: className, variant, size, href, children, ...restProps }: ElementProps = $props();
</script>

{#if href}
  <a
    class={[buttonVariants({ variant, size }), className]}
    {href}
    target="_blank"
    {...restProps}
  >
    {@render children()}
  </a>
{:else}
  <button
    class={[buttonVariants({ variant, size }), className]}
    {...restProps}
  >
    {@render children()}
  </button>
{/if}