// Stream an LDJSON file/stream and reattach pins
export async function reattachPinsFromLDJSON(file: File, drive: { attachPayload: (addr: string, payload: any) => Promise<void>|void }) {
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter(Boolean);
  for (const line of lines) {
    try {
      const evt = JSON.parse(line);
      if (evt?.type === "pinned" && evt?.addr && evt?.payload) {
        await drive.attachPayload(evt.addr, evt.payload);
      }
    } catch {}
  }
}
