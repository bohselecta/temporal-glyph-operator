export {};

declare global {
  interface Window {
    __TGO_OBSERVER__?: {
      on(event: string, cb: (d: any) => void): void;
    };
  }
}
