import * as THREE from "three";

export function focusAddr(camera: THREE.PerspectiveCamera, target: THREE.Vector3, duration = 650) {
  const start = camera.position.clone();
  const end = target.clone().add(new THREE.Vector3(0, 0, 2.2));
  const t0 = performance.now();
  function tick() {
    const t = Math.min(1, (performance.now() - t0) / duration);
    camera.position.lerpVectors(start, end, t);
    camera.lookAt(target);
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
