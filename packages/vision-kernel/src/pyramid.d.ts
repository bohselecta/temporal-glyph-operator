import type { Frame } from "@glyph/core";
export type Level = {
    scale: number;
    width: number;
    height: number;
    data: Uint8ClampedArray;
};
export type Pyramid = {
    levels: Level[];
    t: number;
};
export declare function buildPyramid(frame: Frame, levels?: number): Pyramid;
/** simple perceptual hash (grid-avg luminance) for quick motif detection */
export declare function pHash(level: Level, grid?: number): bigint;
