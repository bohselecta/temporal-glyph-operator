import * as THREE from "three";
import { DriveMeshExact } from "../scene/DriveMeshExact";
import { focusAddr } from "../scene/focusAddr";
import { bindPinned } from "../app/overlay/bindPinned";

export function bootViewerExact(observer: any, levels = 0) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.01, 100);
  camera.position.set(0, -6, 2.6);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  const root = document.getElementById("tgo-canvas")!;
  root.appendChild(renderer.domElement);

  const drive = new DriveMeshExact(scene, levels);
  drive.build();
  bindPinned(observer, drive);

  function onJump(addr: string) {
    const target = drive.centerOf(addr);
    focusAddr(camera, target);
  }

  // Hotkeys
  function handleKeydown(e: KeyboardEvent) {
    switch (e.key) {
      case 'j':
        // Jump to random address
        const randomFace = Math.floor(Math.random() * 14);
        const randomAddr = `A:${levels}:c=${Math.floor(Math.random() * 4)}`;
        onJump(randomAddr);
        break;
      case '[':
        // Previous face
        const prevFace = Math.max(0, (drive as any).currentFace - 1);
        onJump(`${String.fromCharCode(65 + prevFace)}:0`);
        break;
      case ']':
        // Next face
        const nextFace = Math.min(13, ((drive as any).currentFace || 0) + 1);
        onJump(`${String.fromCharCode(65 + nextFace)}:0`);
        break;
    }
  }

  document.addEventListener('keydown', handleKeydown);

  function tick() {
    renderer.setSize(root.clientWidth, root.clientHeight, false);
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();

  return { onJump, drive };
}
