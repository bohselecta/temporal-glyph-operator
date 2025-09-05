import { describe, it, expect } from "vitest";
import { Tape } from "../src/tape";

describe("Fractal Tape", () => {
  it("roundtrips JSON via glyph path", () => {
    const tape = new Tape("seed-123");
    const base = "A:0";
    const value = { pi: 3.14159, arr: [1,2,3], ok: true };
    const addr = tape.write(base, value, 42);
    const out = tape.read(addr);
    expect(out).toEqual(value);
  });

  it("handles different value types", () => {
    const tape = new Tape("seed-456");
    const base = "B:1";
    
    const values = [
      "hello world",
      42,
      true,
      null,
      [1, 2, 3],
      { nested: { data: "test" } }
    ];
    
    for (const value of values) {
      const addr = tape.write(base, value);
      const out = tape.read(addr);
      expect(out).toEqual(value);
    }
  });

  it("generates different addresses for different values", () => {
    const tape = new Tape("seed-789");
    const base = "C:0";
    
    const addr1 = tape.write(base, "value1");
    const addr2 = tape.write(base, "value2");
    
    expect(addr1).not.toEqual(addr2);
    expect(addr1).toMatch(/^C:0:\d+:c=/);
    expect(addr2).toMatch(/^C:0:\d+:c=/);
  });

  it("maintains tick counter", () => {
    const tape = new Tape("seed-tick");
    expect(tape.getTick()).toBe(0);
    
    tape.write("A:0", "test1");
    expect(tape.getTick()).toBe(1);
    
    tape.write("A:0", "test2");
    expect(tape.getTick()).toBe(2);
    
    tape.setTick(100);
    expect(tape.getTick()).toBe(100);
  });
});
