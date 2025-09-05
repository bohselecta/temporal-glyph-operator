import * as THREE from "three";
import { CSASZAR_FACES, CSASZAR_VERTICES, triangleAt, centroid } from "@glyph/glyph-drive";
import { parseAddress } from "@glyph/glyph-drive";

export class DriveMesh {
  private scene: THREE.Scene;
  private faces = CSASZAR_FACES;
  private vertices = CSASZAR_VERTICES;
  private faceMeshes: THREE.Mesh[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
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
  }

  /** Update emissive intensity for a given address (heat overlay). */
  bump(addr: string, amt = 0.4) {
    const p = parseAddress(addr);
    const baseMesh = this.faceMeshes[p.face];
    if (!baseMesh) return;
    const m = baseMesh.material as THREE.MeshStandardMaterial;
    m.emissiveIntensity = Math.min(1.5, (m.emissiveIntensity ?? 0) + amt);
  }

  /** Return centroid of an address subtriangle for camera focus. */
  centerOf(addr: string): THREE.Vector3 {
    const p = parseAddress(addr);
    const tri = triangleAt(p, this.faces);
    const c = centroid(tri);
    return new THREE.Vector3(c[0], c[1], c[2]);
  }

  decay(factor = 0.92) {
    this.faceMeshes.forEach((mesh) => {
      const m = mesh.material as THREE.MeshStandardMaterial;
      m.emissiveIntensity = (m.emissiveIntensity ?? 0) * factor;
    });
  }
}
