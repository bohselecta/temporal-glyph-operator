import type { Address } from "@glyph/glyph-drive";
import type { AddressPolicy, PolicyContext } from "./policies";

/**
 * Locate an address using a specific policy
 */
export function locateWithPolicy(
  policy: AddressPolicy, 
  ctx: PolicyContext, 
  depth = 0
): Address {
  return policy(ctx, depth);
}
