export function hashToLock(seed: string): number {
  let sum = 0;
  for (let i = 0; i < seed.length; i++) {
    sum += seed.charCodeAt(i);
  }
  return sum % 1000;
}

export function loremflickr(opts: {
  tags: string[];
  width?: number;
  height?: number;
  seed: string;
}): string {
  const w = opts.width ?? 800;
  const h = opts.height ?? 800;
  const tags = opts.tags.join(",");
  const lock = hashToLock(opts.seed);
  return `https://loremflickr.com/${w}/${h}/${tags}?lock=${lock}`;
}

export function productImageTags(product: {
  species?: string | string[];
  categoryIds: string[];
  lifeStage?: string | null;
}): string[] {
  const speciesRaw = Array.isArray(product.species)
    ? product.species[0]
    : product.species;

  const lifeStage = product.lifeStage;
  const categories = product.categoryIds;

  let speciesTag: string | null = null;
  if (speciesRaw === "dog") {
    speciesTag = "dog";
  } else if (speciesRaw === "cat") {
    speciesTag = "cat";
  }

  const hasCategory = (fragment: string) =>
    categories.some((c) => c.includes(fragment));

  if (hasCategory("alimentos")) {
    if (speciesTag) return [speciesTag, "food"];
    return ["pet", "food"];
  }

  if (hasCategory("snacks")) {
    if (speciesTag) return [speciesTag, "treat"];
    return ["pet", "treat"];
  }

  if (hasCategory("juguetes")) {
    if (speciesTag) return [speciesTag, "toy"];
    return ["pet", "toy"];
  }

  if (hasCategory("higiene")) {
    if (speciesTag) return [speciesTag, "grooming"];
    return ["pet", "grooming"];
  }

  if (hasCategory("accesorios")) {
    if (speciesTag === "dog") return ["dog", "collar"];
    if (speciesTag === "cat") return ["cat", "accessory"];
    return ["pet", "accessory"];
  }

  if (hasCategory("arenas")) {
    return ["cat", "litter"];
  }

  if (hasCategory("aves") || speciesRaw === "bird") {
    return ["bird", "pet"];
  }

  if (hasCategory("pequenas-mascotas") || speciesRaw === "small_pet") {
    return ["hamster", "pet"];
  }

  if (hasCategory("peces") || speciesRaw === "fish") {
    return ["fish", "aquarium"];
  }

  if (hasCategory("reptiles") || speciesRaw === "reptile") {
    return ["reptile", "pet"];
  }

  if (speciesTag) return [speciesTag, "pet"];
  return ["pet", "animal"];
}

export function petPhotoTags(pet: {
  species: string;
  breed?: string | null;
}): string[] {
  switch (pet.species) {
    case "dog":
      return ["dog", "animal"];
    case "cat":
      return ["cat", "animal"];
    case "bird":
      return ["bird", "pet"];
    case "small_pet":
      return ["hamster", "pet"];
    case "fish":
      return ["fish", "aquarium"];
    case "reptile":
      return ["reptile", "pet"];
    default:
      return ["pet", "animal"];
  }
}

export function blogHeroTags(post: {
  category: string;
  species: string[];
}): string[] {
  const primarySpecies = post.species[0];

  const speciesTag =
    primarySpecies === "dog"
      ? "dog"
      : primarySpecies === "cat"
        ? "cat"
        : "pet";

  switch (post.category) {
    case "cuidados":
      return [speciesTag, "care"];
    case "alimentacion":
      return [speciesTag, "nutrition"];
    case "salud":
      return [speciesTag, "health"];
    case "novedades":
      return [speciesTag, "store"];
    default:
      return [speciesTag, "pet"];
  }
}
