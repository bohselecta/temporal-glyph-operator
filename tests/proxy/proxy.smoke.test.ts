import { FrameBus } from "@glyph/core";
import { SimulatedProxyOperator as TemporalGlyphOperator } from "@glyph/proxy-operator";
import assert from "node:assert/strict";
import test from "node:test";

// Smoke: the operator should emit at least one report when fed frames.
test("TGO emits reports under basic load", async () => {
  const bus = new FrameBus();
  const tgo = new TemporalGlyphOperator(bus, { reportEveryMs: 12, levels: 3, ringSize: 6 });
  let count = 0;
  tgo.on((e) => { if (e.type === "report") count++; });
  tgo.start();

  const w = 96, h = 96;
  const pixels = new Uint8ClampedArray(w * h * 4);
  const now = performance.now();

  for (let i = 0; i < 24; i++) {
    // animate a moving bright pixel to generate non-zero energy/gradients
    const idx = ((i * 7) % (w * h)) * 4;
    pixels.fill(0);
    pixels[idx] = 255; pixels[idx + 1] = 192; pixels[idx + 2] = 224; pixels[idx + 3] = 255;
    bus.emit({ t: now + i * 4, layer: 0, width: w, height: h, pixels });
    await new Promise((r) => setTimeout(r, 4));
  }

  assert.ok(count > 0, "Expected at least one report");
  tgo.stop();
});
