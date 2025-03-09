<script lang="ts">
  import type { WorldParsedMission } from '$types/game/stw/worldInfo';
  import WorldInfoSectionAccordion from '$components/stw/worldInfo/WorldInfoSectionAccordion.svelte';
  import FullScreenLoading from '$components/ui/FullScreenLoading.svelte';
  import { worldInfoCache } from '$lib/stores';
  import { WorldPowerLevels, Worlds } from '$lib/constants/stw/worldInfo';

  const parsedWorldInfo = $derived($worldInfoCache);
  const parsedWorldInfoArray = $derived(parsedWorldInfo &&
    parsedWorldInfo.values().toArray().flatMap((worldMissions) => worldMissions.values().toArray())
  );

  const sections = $derived<{ title: string; missions: WorldParsedMission[] }[]>(parsedWorldInfo && [
    {
      title: 'V-Bucks',
      missions: parsedWorldInfoArray
        .filter((mission) => mission.filters.some((id) => id.includes('currency_mtxswap')))
    },
    {
      title: 'Legendary/Mythic Survivors',
      missions: parsedWorldInfoArray
        .filter((mission) => mission.filters.some((id) => id.includes('workerbasic_sr') || (id.startsWith('Worker:manager') && id.includes('_sr_'))))
    },
    {
      title: 'Twine Peaks ⚡160',
      missions: parsedWorldInfo.get(Worlds.TwinePeaks)!.values().toArray()
        .filter((mission) => mission.powerLevel === WorldPowerLevels[Worlds.TwinePeaks].Endgame_Zone6)
    },
    {
      title: 'Ventures',
      missions: parsedWorldInfo.entries().toArray()
        .filter(([theaterId]) =>
          ![Worlds.Stonewood, Worlds.Plankerton, Worlds.CannyValley, Worlds.TwinePeaks].includes(theaterId)
        )
        .flatMap(([, worldMissions]) => worldMissions.values().toArray())
        .filter((missions) => missions.powerLevel === WorldPowerLevels.ventures.Phoenix_Zone25)
    },
    {
      title: 'Upgrade Llama Tokens',
      missions: parsedWorldInfoArray
        .filter((mission) => mission.filters.some((id) => id.includes('voucher_cardpack_bronze')))
    },
    {
      title: 'Uncommon Perk-Up',
      missions: parsedWorldInfoArray
        .filter((mission) => mission.filters.some((id) => id.includes('alteration_upgrade_uc')))
    }
  ]);
</script>

{#if !sections}
  <FullScreenLoading/>
{:else}
  <div class="flex flex-col gap-y-3">
    {#each sections as { title, missions } (title)}
      <div class="flex flex-col gap-y-2">
        <h1 class="font-bold {!missions.length ? 'opacity-50' : ''}">
          {title}
        </h1>

        <WorldInfoSectionAccordion {missions}/>
      </div>
    {/each}
  </div>
{/if}