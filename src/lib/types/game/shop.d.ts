export type SpitfireResponse<T> = {
  success: boolean;
  status: number;
  data?: T;
  error?: string;
};

export type SpitfireShopFilter = 'All' | 'New' | 'Leaving Soon' | 'Longest Wait';

export type SpitfireShop = {
  lastUpdated: string;
  hash: string;
  image: string;
  offers: SpitfireShopItem[];
};

export type SpitfireShopItem = {
  id: string;
  offerId: string;
  devName: string;
  name: string;
  description: string;
  price: {
    final: number;
    regular: number;
    floor: number;
  };
  assets: {
    featured: string;
    icon: string;
    smallIcon: string;
    lego?: {
      small: string;
      large: string;
    };
    bean?: {
      small: string;
      large: string;
    }
  };
  type: {
    id: string;
    name: string;
  };
  rarity: {
    id: string;
    name: string;
  };
  series?: {
    id: string;
    name: string;
  };
  meta: {
    newDisplayAssetPath: string;
    webURL: string;
    templateId: string;
  };
  dates: {
    releaseDate: string;
    lastSeen: string;
    in: string;
    out: string;
  };
  section: {
    id: string;
    name: string;
  };
  shopHistory: string[];
  sortPriority: number;
};

export type SpitfireShopSection = {
  name: string;
  id: string;
  items: SpitfireShopItem[];
};