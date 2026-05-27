/**
 * Carriers barrel — registers all four providers and re-exports registry API.
 * Import this file once at app bootstrap (or import from here in consumers).
 */
export type { Carrier, CartLine } from "./registry";
export { registerCarrier, getCarrier, getAllCarriers, getRegisteredCarrierIds } from "./registry";

import { registerCarrier } from "./registry";
import { propio } from "./propio";
import { mockChilexpress, mockStarken } from "./mock-courier";
import { pickup } from "./pickup";

// Register all carriers at module load time
registerCarrier(propio);
registerCarrier(mockChilexpress);
registerCarrier(mockStarken);
registerCarrier(pickup);

export { propio } from "./propio";
export { mockChilexpress, mockStarken } from "./mock-courier";
export { pickup } from "./pickup";
