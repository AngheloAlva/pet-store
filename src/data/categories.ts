import type { Category } from "@/types";

export const categories: Category[] = [
  { id: "perros", slug: "perros", name: "Perros", parentId: null, species: "dog", order: 1 },
  { id: "gatos", slug: "gatos", name: "Gatos", parentId: null, species: "cat", order: 2 },
  { id: "exoticos", slug: "exoticos", name: "Exóticos", parentId: null, species: null, order: 3 },

  { id: "alimentos-perros", slug: "alimentos-perros", name: "Alimentos", parentId: "perros", species: "dog", order: 1 },
  { id: "snacks-perros", slug: "snacks-perros", name: "Snacks y Premios", parentId: "perros", species: "dog", order: 2 },
  { id: "juguetes-perros", slug: "juguetes-perros", name: "Juguetes", parentId: "perros", species: "dog", order: 3 },
  { id: "accesorios-perros", slug: "accesorios-perros", name: "Accesorios", parentId: "perros", species: "dog", order: 4 },
  { id: "higiene-perros", slug: "higiene-perros", name: "Higiene", parentId: "perros", species: "dog", order: 5 },

  { id: "alimentos-gatos", slug: "alimentos-gatos", name: "Alimentos", parentId: "gatos", species: "cat", order: 1 },
  { id: "arenas-gatos", slug: "arenas-gatos", name: "Arenas Sanitarias", parentId: "gatos", species: "cat", order: 2 },
  { id: "snacks-gatos", slug: "snacks-gatos", name: "Snacks", parentId: "gatos", species: "cat", order: 3 },
  { id: "juguetes-gatos", slug: "juguetes-gatos", name: "Juguetes", parentId: "gatos", species: "cat", order: 4 },
  { id: "accesorios-gatos", slug: "accesorios-gatos", name: "Accesorios", parentId: "gatos", species: "cat", order: 5 },

  { id: "aves", slug: "aves", name: "Aves", parentId: "exoticos", species: "bird", order: 1 },
  { id: "pequenas-mascotas", slug: "pequenas-mascotas", name: "Pequeñas Mascotas", parentId: "exoticos", species: "small_pet", order: 2 },
  { id: "peces", slug: "peces", name: "Peces", parentId: "exoticos", species: "fish", order: 3 },
  { id: "reptiles", slug: "reptiles", name: "Reptiles", parentId: "exoticos", species: "reptile", order: 4 },
];
