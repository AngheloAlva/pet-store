import type { Image } from "./common";

export type Brand = {
  id: string;
  slug: string;
  name: string;
  logo?: Image;
  description?: string;
};
