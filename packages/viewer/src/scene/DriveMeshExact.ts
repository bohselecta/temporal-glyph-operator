import * as THREE from "three";
import { CSASZAR_FACES, CSASZAR_VERTICES, triangleAt, centroid } from "@glyph/glyph-drive";
import { parseAddress } from "@glyph/glyph-drive";
import { HeatOverlay } from "../overlay/HeatOverlay";
import { encodePathToIndex } from "../overlay/encodePathToIndex";

export class DriveMeshExact {
  private scene: THREE.Scene;
  private faces = CSASZAR_FACES;
  private vertices = CSASZAR_VERTICES;
  private faceMeshes: THREE.Mesh[] = [];
  private heatOverlay: HeatOverlay;
  private levels: number;

  constructor(scene: THREE.Scene, levels = 0) {
    this.scene = scene;
    this.levels = levels;
    this.heatOverlay = new HeatOverlay(scene);
  }

  build() {
    const mat = new THREE.MeshStandardMaterial({ metalness: 0.1, roughness: 0.8, emissiveIntensity: 0.0 });
    for (let i = 0; i < this.faces.length; i++) {
      const tri = this.faces[i];
      const geo = new THREE.BufferGeometry();
      const arr = new Float32Array([
        this.vertices[tri[0]][0], this.vertices[tri[0]][1], this.vertices[tri[0]][2],
        this.vertices[tri[1]][0], this.vertices[tri[1]][1], this.vertices[tri[1]][2],
        this.vertices[tri[2]][0], this.vertices[tri[2]][1], this.vertices[tri[2]][2],
      ]);
      geo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
      geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, mat.clone());
      mesh.userData.faceIndex = i;
      this.scene.add(mesh);
      this.faceMeshes.push(mesh);
    }
    
    // Build heat overlay
    this.heatOverlay.build();
    this.heatOverlay.startDecay();
  }

  /** Update heat for a given address */
  bump(addr: string, amt = 0.4) {
    const p = parseAddress(addr);
    const subdividedIndex = encodePathToIndex(p.face, p.path, this.levels);
    this.heatOverlay.bump(subdividedIndex, amt);
  }

  /** Return centroid of an address subtriangle for camera focus */
  centerOf(addr: string): THREE.Vector3 {
    const p = parseAddress(addr);
    const tri = triangleAt(p, this.faces);
    const c = centroid(tri);
    return new THREE.Vector3(c[0], c[1], c[2]);
  }

  /** Decay all heat levels */
  decay(factor = 0.92) {
    this.heatOverlay.decay(factor);
  }

  /** Get heat level for a face */
  getHeat(faceIndex: number): number {
    return this.heatOverlay.getHeat(faceIndex);
  }

  /** Cleanup */
  destroy() {
    this.heatOverlay.stopDecay();
    this.faceMeshes.forEach(mesh => this.scene.remove(mesh));
    this.faceMeshes = [];
  }
}
