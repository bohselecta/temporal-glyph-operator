import type { AddressMapper, GlyphDrive, KernelStream, Observer, Payload, FinalizeMeta, Address } from "./types";

/**
 * FEG→Drive Adapter
 * - Listens to kernel finalize events
 * - Maps jobId → Address
 * - Attaches payload to Glyph Drive
 * - Notifies Observer (GUI) with a `pinned` event
 */
export class FeqToDriveAdapter {
  constructor(
    private readonly mapper: AddressMapper,
    private readonly drive: GlyphDrive,
    private readonly observer: Observer
  ) {}

  bind(stream: KernelStream) {
    stream.on("finalize", async (final: { jobId: string; result: unknown; meta: FinalizeMeta }) => {
      const addr: Address = this.mapper.locate(final.jobId);
      const payload: Payload = { result: final.result, meta: final.meta };

      try {
        await this.drive.attachPayload(addr, payload);
      } catch (e) {
        // Surface as a GUI toast-friendly event; keep compute loop non-fatal
        this.observer.emit("pinned", { addr, payload: { ...payload, result: { error: String(e) } } });
        return;
      }

      // Optional badge hook for drive renderers
      this.drive.emitBadge?.(addr, "●");

      // Notify observer/UI
      this.observer.emit("pinned", { addr, payload });
    });

    return this; // chainable
  }
}
