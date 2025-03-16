<script lang="ts">
  import type { WorldParsedMission } from '$types/game/stw/worldInfo';
  import WorldInfoSectionAccordion from '$components/stw/worldInfo/WorldInfoSectionAccordion.svelte';
  import { worldInfoCache } from '$lib/stores';
  import { WorldPowerLevels, Worlds } from '$lib/constants/stw/worldInfo';
  import { isLegendaryOrMythicSurvivor } from '$lib/utils';

  const parsedWorldInfo = $derived($worldInfoCache);
  const parsedWorldInfoArray = $derived(parsedWorldInfo &&
    parsedWorldInfo.values().toArray().flatMap((worldMissions) => worldMissions.values().toArray())
  );

  const isLoading = $derived(!$worldInfoCache || !parsedWorldInfo || !parsedWorldInfoArray);

  const sections = $derived<{ title: string; missions: WorldParsedMission[] }[]>([
    {
      title: 'V-Bucks',
      missions: !isLoading && parsedWorldInfoArray
        .filter((mission) => mission.filters.some((id) => id.includes('currency_mtxswap')))
    },
    {
      title: 'Legendary/Mythic Survivors',
      missions: !isLoading && parsedWorldInfoArray
        .filter((mission) => mission.filters.some((id) => isLegendaryOrMythicSurvivor(id)))
    },
    {
      title: 'Twine Peaks ⚡160',
      missions: !isLoading && parsedWorldInfo.get(Worlds.TwinePeaks)!.values().toArray()
        .filter((mission) => mission.powerLevel === WorldPowerLevels[Worlds.TwinePeaks].Endgame_Zone6)
    },
    {
      title: 'Ventures ⚡140',
      missions: !isLoading && parsedWorldInfo.entries().toArray()
        .filter(([theaterId]) =>
          ![Worlds.Stonewood, Worlds.Plankerton, Worlds.CannyValley, Worlds.TwinePeaks].includes(theaterId)
        )
        .flatMap(([, worldMissions]) => worldMissions.values().toArray())
        .filter((missions) => missions.powerLevel === WorldPowerLevels.ventures.Phoenix_Zone25)
    },
    {
      title: 'Upgrade Llama Tokens',
      missions: !isLoading && parsedWorldInfoArray
        .filter((mission) => mission.filters.some((id) => id.includes('voucher_cardpack_bronze')))
    },
    {
      title: 'Uncommon Perk-Up',
      missions: !isLoading && parsedWorldInfoArray
        .filter((mission) => mission.filters.some((id) => id.includes('alteration_upgrade_uc')))
    }
  ]);

  const overview = $derived([
    {
      name: 'V-Bucks',
      icon: '/assets/resources/currency_mtxswap.png',
      amount: countMissionReward(sections.find(({ title }) => title === 'V-Bucks')?.missions, 'currency_mtxswap')
    },
    {
      name: 'Survivors',
      icon: '/assets/resources/voucher_generic_worker_sr.png',
      amount: countMissionReward(sections.find(({ title }) => title === 'Legendary/Mythic Survivors')?.missions, isLegendaryOrMythicSurvivor)
    },
    {
      name: 'Upgrade Llama Tokens',
      icon: '/assets/resources/voucher_cardpack_bronze.png',
      amount: countMissionReward(sections.find(({ title }) => title === 'Upgrade Llama Tokens')?.missions, 'voucher_cardpack_bronze')
    },
    {
      name: 'Uncommon Perk-Up',
      icon: '/assets/resources/reagent_alteration_upgrade_uc.png',
      amount: countMissionReward(sections.find(({ title }) => title === 'Uncommon Perk-Up')?.missions, 'alteration_upgrade_uc')
    }
  ]);

  function countMissionReward(missions: WorldParsedMission[] | undefined, idOrValidator: string | ((id: string) => boolean)) {
    return (missions || []).reduce((acc, crr) => {
      const alertReward = crr.alert?.rewards.find(reward =>
        typeof idOrValidator === 'function' ? idOrValidator(reward.itemId) : reward.itemId.includes(idOrValidator)
      );

      const missionReward = crr.rewards.find(reward =>
        typeof idOrValidator === 'function' ? idOrValidator(reward.itemId) : reward.itemId.includes(idOrValidator)
      );

      acc += (alertReward?.quantity || 0) + (missionReward?.quantity || 0);

      return acc;
    }, 0);
  }
</script>

<div class="flex flex-col">
  <h2 class="font-bold text-2xl">World Info</h2>

  <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-lg bg-muted/5">
    {#each overview as { name, icon, amount } (name)}
      <div class="flex items-center border rounded">
        <div class="flex items-center justify-center size-10 bg-muted-foreground/10 shrink-0">
          <img class="size-7" alt={name} src={icon}/>
        </div>
        <div class="grow px-2 font-medium text-center">
          {amount.toLocaleString()}
        </div>
      </div>
    {/each}
  </div>

  <div class="flex flex-col gap-y-5">
    {#each sections as { title, missions } (title)}
      <div class="flex flex-col gap-y-1">
        <h1 class="font-bold">{title}</h1>

        {#if missions.length}
          <WorldInfoSectionAccordion {missions}/>
        {:else}
          {#if isLoading}
            {#each Array(Math.max(1, Math.floor(Math.random() * 3) + 1)) as _, index (index)}
              <div class="flex items-center justify-between px-2 h-8 bg-muted-foreground/5 rounded-sm skeleton-loader"></div>
            {/each}
          {:else}
            <div class="flex items-center justify-center px-2 h-10 bg-muted-foreground/5 rounded-sm">
              <span class="text-muted-foreground">
                No available missions
              </span>
            </div>
          {/if}
        {/if}
      </div>
    {/each}
  </div>
</div>