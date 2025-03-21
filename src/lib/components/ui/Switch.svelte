<script lang="ts">
  import { Switch } from 'bits-ui';

  type Props = Switch.RootProps;

  let {
    children,
    ...restProps
  }: Props = $props();
</script>

<Switch.Root
  {...restProps}
  class={[
    'peer inline-flex items-center h-6 w-12 shrink-0 cursor-pointer rounded-full transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'disabled:cursor-not-allowed disabled:opacity-50',
    'focus-visible:ring-ring focus-visible:ring-offset-background',
    'data-[state=checked]:bg-primary data-[state=unchecked]:bg-input'
  ]}
>
  <Switch.Thumb
    class={[
      'peer inline-block size-5 rounded-full transition-transform',
      'data-[state=checked]:translate-x-6 data-[state=unchecked]:translate-x-1',
      'data-[state=checked]:bg-background data-[state=unchecked]:bg-primary'
    ]}
  />
</Switch.Root>