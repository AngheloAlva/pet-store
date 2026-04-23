import type { Species } from "./common";

export type Category = {
  id: string;
  slug: string;
  name: string;
  parentId: string | null;
  species: Species | null;
  order: number;
};
