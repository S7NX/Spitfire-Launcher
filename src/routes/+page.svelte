<script lang="ts">
  import { accountsStore } from '$lib/stores';

  const activeAccount = $derived($accountsStore.activeAccount);
</script>

<h1 class="text-2xl font-bold">Main Page</h1>
<p class="text-muted-foreground">{activeAccount ? `Hi, ${activeAccount.displayName}` : 'Login first'}</p>