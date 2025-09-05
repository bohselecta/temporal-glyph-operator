# Calculator Compare — Demo

## Option 1: Next.js Route (Easiest)

Run the main dev server and click the Calculator button:

```bash
npm run -w apps/viewer dev
# Opens at: http://localhost:3000
# Click the orange "Calculator" button in the top navigation
# Or navigate directly to: http://localhost:3000/calc
```

## Option 2: Vite Standalone Entry

Run the calculator page as a standalone Vite app:

```bash
# Using Vite dev server (for standalone development)
npm run -w apps/viewer dev:vite
# Opens at: http://localhost:3001

# Or with specific entry point via URL parameter
npm run -w apps/viewer dev:vite
# Then navigate to: http://localhost:3001/?entry=./src/main-calc.tsx

# Alternative: Using pnpm (if available)
pnpm -C apps/viewer dev:vite
```

**Use it**
- Type an expression (e.g. `(1+2)*3^4/5 - 6`).
- Press **Enter** or click **Compute**.
- See timings for **CPU** vs **TGO** and the results below (truncated to 1000 chars).

**Notes**
- If `window.__TGO_PLANNER__`/`__TGO_OBSERVER__` are available and a `calc` kernel exists, TGO path submits a job and waits for a matching pinned result.
- If not, the TGO path gracefully falls back to the local evaluator so the page still works.

**Supported Operations**
- Basic arithmetic: `+`, `-`, `*`, `/`, `^` (power)
- Functions: `sin`, `cos`, `tan`, `log`, `sqrt`, `abs`
- Parentheses for grouping
- Decimal numbers

**Examples**
- `(1+2)*3^4/5 - 6` → 42.6
- `sin(3.14159/2)` → 1.0
- `sqrt(16) + abs(-5)` → 9.0
- `log(2.71828)` → 1.0

**Architecture**
- **Safe Evaluator**: Uses shunting-yard algorithm (no `eval()`)
- **TGO Integration**: Attempts planner→kernel pipeline with 5s timeout
- **Graceful Fallback**: Falls back to local evaluation if TGO unavailable
- **Performance Tracking**: Measures and displays timing for both paths
