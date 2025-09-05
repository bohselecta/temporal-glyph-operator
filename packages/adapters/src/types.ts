// Re-export Address type from glyph-drive to avoid circular deps
export type Address = `${string}:${number}${string}`; // e.g., "A:2:A1:child=3"

export interface FinalizeMeta {
  jobId: string;
  kernel: string;
  createdAt: number; // epoch ms
  exact: boolean; // BigInt paths used
  seed: string; // RNG seed snapshot
  bounds?: { lo: number; hi: number };
  stats?: { ticks: number; ops: number; throughput: number };
}

export type Payload = {
  result: unknown; // JSON-serializable
  meta: FinalizeMeta;
};

export interface AddressMapper {
  locate(jobId: string): Address;
}

export interface GlyphDrive {
  attachPayload(addr: Address, payload: Payload): Promise<void> | void;
  emitBadge?(addr: Address, badge: string): void;
}

export interface Observer {
  on(event: "partial" | "final" | "pinned", cb: (data: any) => void): void;
  emit(event: "pinned", data: { addr: Address; payload: Payload }): void;
}

export interface KernelStream {
  on(event: "partial" | "finalize", cb: (data: any) => void): void;
}
