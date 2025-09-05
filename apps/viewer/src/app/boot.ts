import * as THREE from "three";
import { DriveMesh } from "../scene/DriveMesh";
import { focusAddr } from "../scene/focusAddr";
import { bindPinned } from "../app/overlay/bindPinned";

export function bootViewer(observer: any) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.01, 100);
  camera.position.set(0, -6, 2.6);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  const root = document.getElementById("tgo-canvas")!;
  root.appendChild(renderer.domElement);

  const drive = new DriveMesh(scene);
  drive.build();
  bindPinned(observer, drive);

  function onJump(addr: string) {
    const target = drive.centerOf(addr);
    focusAddr(camera, target);
  }

  function tick() {
    renderer.setSize(root.clientWidth, root.clientHeight, false);
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();

  return { onJump };
}
