# C4 Container (TGO + Glyph Drive)

```mermaid
flowchart LR
  user[User] --> console[Console]
  console --> planner[Planner]
  planner --> feg[Fractal Exec Graph]
  feg --> kernels[Kernels]
  kernels <--> tape[Virtual Tape]
  tape <--> mapper[Address Mapper]
  mapper <--> drive[Glyph Drive (Császár Torus)]
  kernels --> observer[Observer GUI]
  tape --> observer
  drive --> observer
```

## Components

- **Console**: Natural language input interface
- **Planner**: Converts prompts to Fractal Execution Graphs
- **Kernels**: Parallel computation workers (Monte Carlo, FFT, etc.)
- **Virtual Tape**: Procedural memory system
- **Address Mapper**: Maps jobId to torus addresses
- **Glyph Drive**: Császár torus storage with payload attachment
- **Observer GUI**: Real-time visualization and pinned results
