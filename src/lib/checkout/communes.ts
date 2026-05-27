/**
 * Commune coverage list — F3.1
 * Hardcoded list of communes where delivery is supported.
 * Case-insensitive matching via isCovered().
 */

export const COVERED_COMMUNES: readonly string[] = [
  // Región Metropolitana — zona central
  "Santiago",
  "Providencia",
  "Las Condes",
  "Vitacura",
  "Lo Barnechea",
  "Ñuñoa",
  "Macul",
  "La Florida",
  "Puente Alto",
  "Maipú",
  "Pudahuel",
  "Quilicura",
  "Huechuraba",
  "Conchalí",
  "Renca",
  "Independencia",
  "Recoleta",
  "Cerro Navia",
  "Lo Prado",
  "Quinta Normal",
  "Estación Central",
  "Cerrillos",
  "Buin",
  "San Bernardo",
  "La Cisterna",
  "El Bosque",
  "La Granja",
  "La Pintana",
  "Lo Espejo",
  "Pedro Aguirre Cerda",
  "San Miguel",
  "San Joaquín",
  "San Ramón",
  "La Reina",
  "Peñalolén",
  "Colina",
  "Lampa",
  "Tiltil",
  "Pirque",
  "San José de Maipo",
  "Isla de Maipo",
  "Calera de Tango",
  "Paine",
  "El Monte",
  "Talagante",
  "Peñaflor",
  "Padre Hurtado",
  "Curacaví",
  "María Pinto",
  "Melipilla",
  "Alhué",
  "San Pedro",
  "El Monte",
];

const COVERED_SET = new Set(COVERED_COMMUNES.map((c) => c.toLowerCase()));

/**
 * Returns true if the commune is in the covered delivery area.
 * When settings.coveredCommunes is provided, use it instead of the hardcoded list.
 * Case-insensitive comparison.
 */
export function isCovered(
  commune: string,
  settings?: { coveredCommunes?: string[] | null },
): boolean {
  const list = settings?.coveredCommunes;
  if (list && list.length > 0) {
    return list.some((c) => c.toLowerCase() === commune.trim().toLowerCase());
  }
  return COVERED_SET.has(commune.trim().toLowerCase());
}
