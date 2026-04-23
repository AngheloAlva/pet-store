import { siteConfig } from "./site";

const ORIGIN = siteConfig.url.replace(/\/+$/, "");

export function absoluteUrl(path: string): string {
  if (!path) return `${ORIGIN}/`;
  const trimmed = path.replace(/^\/+/, "");
  if (trimmed === "") return `${ORIGIN}/`;
  const withoutTrailing = trimmed.replace(/\/+$/, "");
  return `${ORIGIN}/${withoutTrailing}`;
}
