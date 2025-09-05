# @glyph/fractal-tape

Deterministic, geometry-addressable tape. Encodes values as base-4 glyph paths that extend your Császár face addressing. Pure encode/decode; persistence handled by adapters.

## API

```ts
const tape = new Tape("seed");
const addr = tape.write("A:0", { hello: "world" }, 0);
const value = tape.read(addr); // { hello: "world" }
```

## Notes

- Not cryptographically secure. Suitable for deterministic storage & replay.
- Use adapters to pin results to Drive at the returned Address.
