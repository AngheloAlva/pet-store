export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

export type StoreSchedule = {
  weekdays: string;
  saturday: string;
  sunday: string;
};

export type StoreService = "shop" | "vet" | "grooming" | "pharmacy";

export type Coordinates = {
  lat: number;
  lng: number;
};

export type Store = {
  id: string;
  slug: string;
  name: string;
  address: string;
  commune: string;
  phone: string;
  coordinates: Coordinates;
  schedule: StoreSchedule;
  services: StoreService[];
  reference?: string;
  imageUrl?: string | null;
};

export type StockLevel = {
  variantId: string;
  storeId: string;
  status: StockStatus;
};
