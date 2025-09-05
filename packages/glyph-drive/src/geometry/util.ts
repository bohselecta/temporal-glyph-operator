/**
 * Safe array access helper for geometry operations
 */
export function safe<T>(arr: ArrayLike<T>, i: number): T { 
  const v = (arr as any)[i]; 
  if (v == null) throw new Error(`index ${i} out of range`); 
  return v as T; 
}
