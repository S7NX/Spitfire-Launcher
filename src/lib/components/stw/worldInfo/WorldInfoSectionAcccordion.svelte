<script lang="ts">
  import { Accordion, type WithoutChildrenOrChild } from 'bits-ui';
  import ChevronDownIcon from 'lucide-svelte/icons/chevron-down';
  import type { WorldParsedMission } from '$types/game/stw/worldInfo';

  type Props = WithoutChildrenOrChild<Accordion.ItemProps> & {
    missions: WorldParsedMission[];
  };

  const { missions, ...restProps }: Props = $props();

  function getUncommonPerkupReward(mission: WorldParsedMission) {
    return mission.rewards.find(({ itemId }) => itemId.includes('alteration_upgrade_uc'))
      || mission.alert?.rewards.find(({ itemId }) => itemId.includes('alteration_upgrade_uc'));
  }

  function getVbucksReward(mission: WorldParsedMission) {
    return mission.alert?.rewards.find(({ itemId }) => itemId.includes('currency_mtxswap'));
  }

  function getSurvivorsReward(mission: WorldParsedMission) {
    return mission.alert?.rewards.find(({ itemId }) =>
      itemId.includes('workerbasic_sr') ||
        (itemId.startsWith('Worker:manager') && itemId.includes('_sr_'))
    );
  }

  function getUpgradeLlamaTokens(mission: WorldParsedMission) {
    return mission.alert?.rewards.find(({ itemId }) => itemId.includes('voucher_cardpack_bronze'));
  }
</script>

<Accordion.Root type="multiple">
  {#each missions as mission (mission.guid)}
    {@const vbucksReward = getVbucksReward(mission)}
    {@const survivorsReward = getSurvivorsReward(mission)}
    {@const upgradeLlamaTokens = getUpgradeLlamaTokens(mission)}
    {@const uncommonPerkupReward = getUncommonPerkupReward(mission)}
    {@const allRewards = [vbucksReward, survivorsReward, upgradeLlamaTokens, uncommonPerkupReward].filter(x => !!x)}
    {@const missionModifiers = mission.modifiers?.slice(0, 5) || []}

    <Accordion.Item
      class="group mt-1"
      value={mission.tileIndex.toString()}
      {...restProps}
    >
      <Accordion.Header>
        <Accordion.Trigger class="flex items-center justify-between px-2 h-10 w-full bg-muted-foreground/5 rounded-sm transition-all [&[data-state=open]>span>svg]:rotate-180">
          <span class="flex gap-1 items-center py-0.5">
            {#if mission.zone.iconUrl}
              <img
                class="size-5"
                alt="Zone icon"
                loading="lazy"
                src={mission.zone.iconUrl}
              />
            {:else}
              <span
                style="border-color: {mission.zone.color}; color: {mission.zone.color};"
                class="border border-opacity-40 flex flex-shrink-0 font-bold items-center justify-center relative rounded size-5 text-xs uppercase"
              >
                {mission.zone.letter}
              </span>
            {/if}

            <img
              class="size-6"
              alt="Zone icon"
              loading="lazy"
              src={mission.zone.type.imageUrl}
            />
            <span class="border flex-shrink-0 pl-0.5 pr-2 py-1 rounded text-xs">⚡{mission.powerLevel}</span>

            <span class="flex gap-x-2">
              {#if allRewards.length > 0}
                {#each allRewards as reward, i (reward.itemId)}
                  <div class="flex gap-1">
                    <img
                      class="size-6"
                      alt="Reward icon"
                      loading="lazy"
                      src={reward.imageUrl}
                    />

                    {#if reward.quantity > 1}
                      <span class="font-bold">
                        {reward.quantity.toLocaleString()}
                      </span>
                    {/if}

                    {#if i < allRewards.length - 1}
                      <span class="font-bold">•</span>
                    {/if}
                  </div>
                {/each}
              {/if}

              {#if missionModifiers.length > 0}
                {#if allRewards.length > 0}
                  <span class="font-bold">•</span>
                {/if}

                <div class="flex gap-1">
                  {#each missionModifiers as modifier (modifier.id)}
                    <img
                      class="size-6"
                      alt="Modifier icon"
                      loading="lazy"
                      src={modifier.imageUrl}
                    />
                  {/each}
                </div>
              {/if}
            </span>
          </span>

          <span class="inline-flex items-center align-center">
            <ChevronDownIcon class="size-5 transition-transform"/>
          </span>
        </Accordion.Trigger>
      </Accordion.Header>
      <!-- todo: add animations -->
      <Accordion.Content class="data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down overflow-hidden text-sm mt-1 tracking-[-0.01rem] bg-muted-foreground/5"
      >
        <div class="grid grid-cols-2 px-4 py-2">
          {#if mission.alert?.rewards?.length}
            <div class="flex flex-col gap-y-1">
              <h2 class="font-medium">Alert Rewards</h2>
              <div class="flex flex-col gap-x-1">
                {#each mission.alert.rewards as reward (reward.itemId)}
                  <div class="flex items-center gap-1">
                    <img
                      class="size-4"
                      alt="Alert timer"
                      loading="lazy"
                      src="/assets/world/alert.png"
                    />

                    <img
                      class="size-6"
                      alt="Reward icon"
                      loading="lazy"
                      src={reward.imageUrl}
                    />

                    {#if reward.quantity > 1}
                      <span class="font-medium">
                        {reward.quantity.toLocaleString()}
                      </span>
                    {/if}
                  </div>
                {/each}
              </div>
            </div>
          {/if}

          <div class="flex flex-col gap-y-1">
            <h2 class="font-medium">Rewards</h2>
            <div class="flex gap-x-1">
              {#each mission.rewards as reward (reward.itemId)}
                <div class="flex gap-1">
                  <img
                    class="size-6"
                    alt="Reward icon"
                    src={reward.imageUrl}
                  />

                  {#if reward.quantity > 1}
                    <span class="font-medium">
                      {reward.quantity.toLocaleString()}
                    </span>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        </div>
      </Accordion.Content>
    </Accordion.Item>
  {/each}
</Accordion.Root>