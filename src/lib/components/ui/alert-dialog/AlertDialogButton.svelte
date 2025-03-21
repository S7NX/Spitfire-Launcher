<script lang="ts">
  import { AlertDialog } from 'bits-ui';
  import { tv, type VariantProps } from 'tailwind-variants';
  import type { Snippet } from 'svelte';

  const dialogButtonVariants = tv({
    base: 'rounded-md inline-flex w-full items-center justify-center font-medium p-2 transition-all duration-200 disabled:opacity-50',
    variants: {
      buttonColor: {
        primary: 'bg-primary text-primary-foreground hover:bg-primary/80',
        secondary: 'bg-muted text-primary hover:bg-muted/80',
        epic: 'bg-epic text-epic-secondary hover:bg-epic/80'
      }
    },
    defaultVariants: {
      buttonColor: 'primary'
    }
  });

  type Props = AlertDialog.CancelProps & VariantProps<typeof dialogButtonVariants> & {
    children: Snippet;
    buttonType: 'action' | 'cancel';
  };

  let {
    children,
    buttonType,
    buttonColor,
    ...restProps
  }: Props = $props();

  const AlertDialogButton = buttonType === 'action' ? AlertDialog.Action : AlertDialog.Cancel;
</script>

<AlertDialogButton
  {...restProps}
  class={[
    dialogButtonVariants({ buttonColor: buttonColor || (buttonType === 'action' ? 'primary' : 'secondary') }),
    'focus-visible:ring-foreground focus-visible:ring-offset-background focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2',
    restProps.class
  ]}
>
  {@render children()}
</AlertDialogButton>
