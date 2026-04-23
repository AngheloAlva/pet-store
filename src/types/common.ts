export type Species = "dog" | "cat" | "bird" | "small_pet" | "fish" | "reptile" | "other";

export type LifeStage = "puppy" | "adult" | "senior" | "all";

export type Size = "mini" | "small" | "medium" | "large" | "giant";

export type WeightUnit = "g" | "kg";
export type VolumeUnit = "ml" | "l";
export type CountUnit = "unit" | "pack";

export type Quantity =
  | { value: number; unit: WeightUnit }
  | { value: number; unit: VolumeUnit }
  | { value: number; unit: CountUnit };

export type Money = {
  amount: number;
  currency: "CLP";
};

export type Image = {
  url: string;
  alt: string;
  width?: number;
  height?: number;
};
