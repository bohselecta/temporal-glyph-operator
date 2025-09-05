// Re-export the shared evaluator from kernels package
export { evaluateExpression } from "@glyph/kernels";

/**
 * Local baseline evaluator for benchmarking
 * This is just a reference to the shared implementation
 * but kept as a separate module for potential future customization
 */
