import { Tape } from "@glyph/fractal-tape";
import type { GlyphDrive, Address } from "@glyph/glyph-drive";
import type { Observer, FinalizeMeta, KernelStream } from "./types";

/**
 * Adapter that binds finalize events to Fractal Tape encoding.
 * Encodes values into base-4 glyph paths and attaches to Drive.
 */
export class TapeAdapter {
  private tape: Tape;
  private drive: GlyphDrive;
  private observer: Observer;

  constructor(drive: GlyphDrive, observer: Observer, seed = "default-seed") {
    this.tape = new Tape(seed);
    this.drive = drive;
    this.observer = observer;
  }

  /**
   * Bind to a kernel stream and encode values via Fractal Tape.
   */
  bind(stream: KernelStream) {
    stream.on("finalize", async (final: { jobId: string; result: unknown; meta: FinalizeMeta }) => {
      try {
        // Encode the result using Fractal Tape
        const baseAddr = this.jobIdToBaseAddr(final.jobId);
        const encodedAddr = this.tape.write(baseAddr, final.result, final.meta.createdAt);
        
        // Create payload with encoded address
        const payload = {
          result: final.result,
          meta: {
            ...final.meta,
            encodedAddr,
            tapeSeed: this.tape.getSeed(),
            tapeTick: this.tape.getTick()
          }
        };
        
        // Attach to Drive
        await this.drive.attachPayload(encodedAddr as Address, payload);
        
        // Emit pinned event
                this.observer.emit("pinned", {
          addr: encodedAddr as Address,
          payload 
        });
        
      } catch (error) {
        console.error("TapeAdapter error:", error);
        this.observer.emit("pinned", { 
          addr: "error" as Address, 
          payload: { 
            result: { error: String(error) }, 
            meta: { jobId: "error", kernel: "error", createdAt: Date.now(), exact: false, seed: "error" } 
          } 
        });
      }
    });
    
    return this;
  }

  /**
   * Convert jobId to base address for tape encoding.
   */
  private jobIdToBaseAddr(jobId: string): string {
    // Simple hash to face mapping (reuse existing logic)
    let h = 2166136261 >>> 0;
    for (let i = 0; i < jobId.length; i++) {
      h ^= jobId.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    const face = h % 14;
    const faceLabel = String.fromCharCode(65 + face); // A-N
    return `${faceLabel}:0`;
  }

  /**
   * Get the underlying tape instance.
   */
  getTape(): Tape {
    return this.tape;
  }

  /**
   * Read a value from an encoded address.
   */
  read(addr: string): any {
    return this.tape.read(addr);
  }
}
