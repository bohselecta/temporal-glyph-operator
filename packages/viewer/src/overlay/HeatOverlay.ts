import * as THREE from "three";
import { CSASZAR_FACES, CSASZAR_VERTICES } from "@glyph/glyph-drive";

/**
 * Per-face color ramp heatmap driven by pinned events (blue→yellow→red), with decay.
 */
export class HeatOverlay {
  private scene: THREE.Scene;
  private faceMeshes: THREE.Mesh[] = [];
  private heatLevels: number[] = [];
  private decayInterval?: NodeJS.Timeout;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.heatLevels = new Array(CSASZAR_FACES.length).fill(0);
  }

  build() {
    const mat = new THREE.MeshStandardMaterial({ 
      metalness: 0.1, 
      roughness: 0.8, 
      emissiveIntensity: 0.0,
      vertexColors: true
    });
    
    for (let i = 0; i < CSASZAR_FACES.length; i++) {
      const tri = CSASZAR_FACES[i];
      const geo = new THREE.BufferGeometry();
      
      // Position data
      const positions = new Float32Array([
        CSASZAR_VERTICES[tri[0]][0], CSASZAR_VERTICES[tri[0]][1], CSASZAR_VERTICES[tri[0]][2],
        CSASZAR_VERTICES[tri[1]][0], CSASZAR_VERTICES[tri[1]][1], CSASZAR_VERTICES[tri[1]][2],
        CSASZAR_VERTICES[tri[2]][0], CSASZAR_VERTICES[tri[2]][1], CSASZAR_VERTICES[tri[2]][2],
      ]);
      
      // Color data (will be updated by heat)
      const colors = new Float32Array([
        0, 0, 1, // blue
        0, 0, 1, // blue  
        0, 0, 1, // blue
      ]);
      
      geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      geo.computeVertexNormals();
      
      const mesh = new THREE.Mesh(geo, mat.clone());
      mesh.userData.faceIndex = i;
      this.scene.add(mesh);
      this.faceMeshes.push(mesh);
    }
  }

  /** Bump heat level for a face and update colors */
  bump(faceIndex: number, amount = 1.0) {
    this.heatLevels[faceIndex] = Math.min(10, this.heatLevels[faceIndex] + amount);
    this.updateFaceColors(faceIndex);
  }

  /** Update colors for a specific face based on heat level */
  private updateFaceColors(faceIndex: number) {
    const mesh = this.faceMeshes[faceIndex];
    if (!mesh) return;
    
    const geo = mesh.geometry as THREE.BufferGeometry;
    const colorAttr = geo.getAttribute("color") as THREE.BufferAttribute;
    const colors = colorAttr.array as Float32Array;
    
    const heat = this.heatLevels[faceIndex];
    const color = ramp(heat);
    
    // Set all 3 vertices to the same color
    for (let i = 0; i < 3; i++) {
      colors[i * 3 + 0] = color[0];
      colors[i * 3 + 1] = color[1];
      colors[i * 3 + 2] = color[2];
    }
    
    colorAttr.needsUpdate = true;
  }

  /** Decay all heat levels */
  decay(factor = 0.92) {
    for (let i = 0; i < this.heatLevels.length; i++) {
      this.heatLevels[i] *= factor;
      if (this.heatLevels[i] < 0.01) {
        this.heatLevels[i] = 0;
      }
      this.updateFaceColors(i);
    }
  }

  /** Start decay loop */
  startDecay(intervalMs = 250) {
    this.decayInterval = setInterval(() => this.decay(), intervalMs);
  }

  /** Stop decay loop */
  stopDecay() {
    if (this.decayInterval) {
      clearInterval(this.decayInterval);
      this.decayInterval = undefined;
    }
  }

  /** Get heat level for a face */
  getHeat(faceIndex: number): number {
    return this.heatLevels[faceIndex] || 0;
  }
}

/**
 * Color ramp function: blue → yellow → red
 * Input: heat level (0-10)
 * Output: RGB color [r, g, b] in [0,1]
 */
export function ramp(heat: number): [number, number, number] {
  const t = Math.max(0, Math.min(1, heat / 10));
  
  if (t < 0.5) {
    // Blue to yellow
    const localT = t * 2;
    return [localT, localT, 1 - localT];
  } else {
    // Yellow to red
    const localT = (t - 0.5) * 2;
    return [1, 1 - localT, 0];
  }
}
