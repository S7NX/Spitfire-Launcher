<script lang="ts">
  import WorldInfoOverview from '$components/stw/worldInfo/WorldInfoOverview.svelte';
  import WorldInfoClaimedAlerts from '$components/stw/worldInfo/WorldInfoClaimedAlerts.svelte';
  import Tabs from '$components/ui/Tabs.svelte';
  import { t } from '$lib/utils/util';

  const tabs = $derived([
    { id: 'overview', name: $t('stwMissionAlerts.tabs.overview'), component: WorldInfoOverview },
    { id: 'claimedAlerts', name: $t('stwMissionAlerts.tabs.claimedAlerts'), component: WorldInfoClaimedAlerts }
  ]);
</script>

<div class="flex flex-col gap-y-2">
  <h2 class="font-bold text-2xl">{$t('stwMissionAlerts.page.title')}</h2>

  <Tabs switchType="class" {tabs} />
</div>
