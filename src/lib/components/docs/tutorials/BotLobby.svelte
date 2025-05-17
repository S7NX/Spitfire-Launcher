<script lang="ts">
  import BaseModal from '$components/docs/BaseModal.svelte';
  import { t } from '$lib/utils/util';
</script>

<BaseModal>
  <h2>{$t('botLobby.page.title')}</h2>

  <h3>{$t('docs.howToUse')}</h3>
  <ol>
    <li>
      {$t('docs.botLobby.howToUse.0')}
    </li>
    <li>
      {$t('docs.botLobby.howToUse.1')}
    </li>
    <li>
      {$t('docs.botLobby.howToUse.2')}
    </li>
    <li>
      {$t('docs.botLobby.howToUse.3')}
    </li>
  </ol>

  <h3>{$t('docs.faq')}</h3>
  <ul>
    <li>
      <strong>{$t('docs.botLobby.faq.0.question')}</strong>
      <p>{$t('docs.botLobby.faq.0.answer')}</p>
    </li>
    <li>
      <strong>{$t('docs.botLobby.faq.1.question')}</strong>
      <p>{$t('docs.botLobby.faq.1.answer')}</p>
    </li>
    <li>
      <strong>{$t('docs.botLobby.faq.2.question')}</strong>
      <p>{$t('docs.botLobby.faq.2.answer')}</p>
    </li>
    <li>
      <strong>{$t('docs.botLobby.faq.3.question')}</strong>
      <p>{$t('docs.botLobby.faq.3.answer')}</p>
    </li>
  </ul>
</BaseModal>