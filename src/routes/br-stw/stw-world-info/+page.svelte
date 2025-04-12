<script lang="ts">
  import WorldInfoOverview from '$components/stw/worldInfo/WorldInfoOverview.svelte';
  import WorldInfoCompletedAlerts from '$components/stw/worldInfo/WorldInfoCompletedAlerts.svelte';
  import Tabs from '$components/ui/Tabs.svelte';
  import { t } from '$lib/utils/util';

  const tabs = $derived([
    { id: 'overview', name: $t('stwMissionAlerts.tabs.overview'), component: WorldInfoOverview },
    { id: 'claimedAlerts', name: $t('stwMissionAlerts.tabs.claimedAlerts'), component: WorldInfoCompletedAlerts }
  ]);
</script>

<div class="flex flex-col gap-y-2">
  <h2 class="font-bold text-2xl">{$t('stwMissionAlerts.page.title')}</h2>

  <Tabs switchType="class" {tabs} />
</div>
