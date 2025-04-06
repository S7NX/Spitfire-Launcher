<script lang="ts">
  import BaseModal from '$components/docs/BaseModal.svelte';
  import { accountsStore } from '$lib/stores';

  const activeAccount = $derived($accountsStore.activeAccount);
</script>

<BaseModal>
  <h2>Custom Status</h2>
  <p>
    It allows you to set a custom status in the game, as the name suggests.
    <strong>Important note:</strong> This only works if you aren't online in the game.
  </p>

  <div class="bg-gradient-to-r from-[#005ba3] to-[#0674b5] w-3/4 mx-auto h-16 flex items-center px-4 rounded-sm">
    <div class="relative mr-5">
      <div class="size-10 bg-gradient-to-b from-[#0049ae] to-[#0570c1] rounded-full flex items-center justify-center">
        <img class="rounded-full" alt="Avatar" src="/assets/misc/rookie-spitfire-icon.png">
      </div>
      <div class="absolute -bottom-0.5 -right-0.5 size-3.5 bg-green-500 border-2 border-[#0164aa] rounded-full"></div>
    </div>

    <div class="flex flex-col leading-tight overflow-hidden">
      <span class="text-white font-burbank font-semibold">{activeAccount?.displayName || 'Burak'}</span>
      <span class="text-[#78abd2] font-heading-now font-semibold text-sm uppercase outline-none whitespace-nowrap" contenteditable>
        Your status here
      </span>
    </div>
  </div>
</BaseModal>