import { describe, it, expect, vi } from "vitest";
import { FeqToDriveAdapter } from "../src/feq-to-drive";

const fakeStream = () => {
  const handlers: Record<string, Function[]> = { finalize: [] } as any;
  return {
    on: (ev: string, cb: Function) => { (handlers[ev] ||= []).push(cb); },
    emitFinalize: (data: any) => handlers.finalize.forEach(fn => fn(data))
  } as any;
};

describe("FeqToDriveAdapter", () => {
  it("maps, attaches, and emits pinned", async () => {
    const mapper = { locate: vi.fn().mockReturnValue("A:1:A0:child=2") };
    const drive = { attachPayload: vi.fn(), emitBadge: vi.fn() };
    const observer = { emit: vi.fn(), on: () => {} } as any;

    const adapter = new FeqToDriveAdapter(mapper as any, drive as any, observer);
    const stream = fakeStream();
    adapter.bind(stream);

    stream.emitFinalize({ jobId: "j1", result: 3.14, meta: { jobId: "j1", kernel: "pi", createdAt: 0, exact: false, seed: "s" } });

    expect(mapper.locate).toHaveBeenCalledWith("j1");
    expect(drive.attachPayload).toHaveBeenCalled();
    expect(drive.emitBadge).toHaveBeenCalled();
    expect(observer.emit).toHaveBeenCalledWith("pinned", expect.objectContaining({ addr: "A:1:A0:child=2" }));
  });
});
