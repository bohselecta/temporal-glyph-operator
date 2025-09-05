import { Vector3 } from "three";

export function focusAddr(scene: any, addr: string, opts: { duration?: number } = {}) {
  const duration = opts.duration ?? 650;
  const target: Vector3 = scene.drive.centerOf(addr); // implement centerOf(addr)
  const cam = scene.camera;
  const start = cam.position.clone();
  const end = target.clone().add(new Vector3(0, 0, 2.2));
  const t0 = performance.now();
  function tick() {
    const t = Math.min(1, (performance.now() - t0) / duration);
    cam.position.lerpVectors(start, end, t);
    cam.lookAt(target);
    t < 1 ? requestAnimationFrame(tick) : null;
  }
  requestAnimationFrame(tick);
}
