# Performance Budgets

## Core Operations
- **AddressMapper.locate**: P95 < 0.3ms (10k locates)
- **Drive.attachPayload**: P95 < 1.0ms (10k attaches, in-memory)
- **buildPyramid**: < 8ms (levels≤6 over 512×512 frame)
- **proxy reports**: < 2MB/s sustained allocation

## Measurement
- All budgets measured on Node 20, typical laptop hardware
- P95 = 95th percentile of operation times
- CI gates enforce these limits automatically

## Violations
If a budget is exceeded:
1. CI will fail the build
2. Add performance regression test
3. Optimize or adjust budget with justification
