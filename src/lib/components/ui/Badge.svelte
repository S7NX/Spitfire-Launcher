<script lang="ts">
  import { tv, type VariantProps } from 'tailwind-variants';
  import { cn } from '$lib/utils';
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';

  const badgeVariants = tv({
    base: 'px-3 py-1 rounded-full',
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground',
        secondary: 'bg-secondary text-secondary-foreground',
        outline: 'bg-transparent text-input-foreground border-input',
        ghost: 'bg-transparent text-input-foreground border-none'
      }
    },
    defaultVariants: {
      variant: 'primary'
    }
  });

  type BadgeProps = {
    class?: string;
    children: Snippet;
  } & HTMLAttributes<any> & VariantProps<typeof badgeVariants>;

  let {
    class: className,
    variant,
    children,
    ...restProps
  }: BadgeProps = $props();
</script>

<span
  {...restProps}
  class={cn(badgeVariants({ variant }), className)}
>
  {@render children()}
</span>