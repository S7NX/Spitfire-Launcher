<script lang="ts">
  import WorldInfoOverview from '$components/stw/worldInfo/WorldInfoOverview.svelte';
  import WorldInfoCompletedAlerts from '$components/stw/worldInfo/WorldInfoCompletedAlerts.svelte';
  import Tabs from '$components/ui/Tabs.svelte';

  const tabs = [
    { name: 'Overview', component: WorldInfoOverview },
    { name: 'Claimed Alerts', component: WorldInfoCompletedAlerts }
  ];
</script>

<div class="flex flex-col gap-y-2">
  <h2 class="font-bold text-2xl">World Info</h2>

  <Tabs switchType="class" {tabs}/>
</div>