<script lang="ts">
  import BaseModal from '$components/docs/BaseModal.svelte';
  import YoutubeVideoEmbed from '$components/docs/YoutubeVideoEmbed.svelte';
</script>

<BaseModal>
  <h2>Auto-Kick</h2>
  <p>
    Auto-Kick is a system that automatically kicks players from a mission once they complete it.
    It can also claim any rewards and transfers materials from your storage to your backpack.
  </p>

  <h3>Important Notes</h3>
  <ul>
    <li>
      If you have multiple accounts playing the same mission, you don't need to add all of them to the Auto-Kick system.
      The system will automatically kick them.
    </li>
    <li>
      If claiming rewards doesn't work or there is a bug, adjust the "Claiming Rewards Delay" in the settings (found in the top right corner).
    </li>
  </ul>

  <YoutubeVideoEmbed title="Auto-Kick Tutorial" videoId="m7m0UQVTpcY"/>
</BaseModal>