import type { IngredientData, RarityType, ResourceData, SurvivorData, SurvivorUniqueLeadData, TrapData, DailyQuestData } from '$types/game/stw/resources';

import resourcesJson from '$lib/data/resources.json';
import survivorsJson from '$lib/data/survivors.json';
import survivorsMythicLeadsJson from '$lib/data/survivorsMythicLeads.json';
import ingredientsJson from '$lib/data/ingredients.json';
import trapsJson from '$lib/data/traps.json';
import dailyQuestsJson from '$lib/data/dailyQuests.json';

export const RarityTypes = Object.freeze({
  Common: 'c',
  Uncommon: 'uc',
  Rare: 'r',
  Epic: 'vr',
  Legendary: 'sr',
  Mythic: 'ur'
} as const);

export const RarityNames: Record<RarityType, string> = {
  [RarityTypes.Common]: 'Common',
  [RarityTypes.Uncommon]: 'Uncommon',
  [RarityTypes.Rare]: 'Rare',
  [RarityTypes.Epic]: 'Epic',
  [RarityTypes.Legendary]: 'Legendary',
  [RarityTypes.Mythic]: 'Mythic'
};

export const FounderEditions = Object.freeze({
  Standard: 'Quest:foundersquest_getrewards_0_1',
  Deluxe: 'Quest:foundersquest_getrewards_1_2',
  SuperDeluxe: 'Quest:foundersquest_getrewards_2_3',
  Limited: 'Quest:foundersquest_getrewards_3_4',
  Ultimate: 'Quest:foundersquest_getrewards_4_5'
} as const);

export const resources = resourcesJson as Record<string, ResourceData>;
export const survivors = survivorsJson as Record<string, SurvivorData>;
export const survivorsMythicLeads = survivorsMythicLeadsJson as Record<string, SurvivorUniqueLeadData>;
export const ingredients = ingredientsJson as Record<string, IngredientData>;
export const traps = trapsJson as Record<string, TrapData>;
export const dailyQuests = dailyQuestsJson as Record<string, DailyQuestData>;