<script lang="ts">
  import BaseModal from '$components/docs/BaseModal.svelte';
  import YoutubeVideoEmbed from '$components/docs/YoutubeVideoEmbed.svelte';
  import { t } from '$lib/utils/util';
</script>

<BaseModal>
  <h2>{$t('autoKick.page.title')}</h2>
  <p>{$t('docs.autoKick.description')}</p>

  <h3>{$t('docs.importantNotes')}</h3>
  <ul>
    <li>{$t('docs.autoKick.importantNotes.0')}</li>
    <li>{$t('docs.autoKick.importantNotes.1')}</li>
  </ul>

  <YoutubeVideoEmbed title="Auto-Kick Tutorial" videoId="jkQYdWAARBg"/>
</BaseModal>