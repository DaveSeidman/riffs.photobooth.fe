import { ExtrudeGeometry, Shape, Vector2 } from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

// Cross-section in XY, extruded and then laid along X. Each of the eight
// panels bows outward; quadratic corner arcs round the longitudinal edges.
export function createOctagonalGlass({ convexity = 0.12, bevel = 0.1 } = {}) {
  const radius = 1.32;
  const vertices = Array.from({ length: 8 }, (_, i) => {
    const a = Math.PI / 8 + i * Math.PI / 4;
    return new Vector2(Math.cos(a) * radius, Math.sin(a) * radius);
  });
  const corner = Math.max(0.018, Math.min(0.35, bevel * 1.8));
  const shape = new Shape();
  const toward = (a, b) => a.clone().lerp(b, corner);
  const first = toward(vertices[0], vertices[7]);
  shape.moveTo(first.x, first.y);
  for (let i = 0; i < 8; i++) {
    const v = vertices[i], next = vertices[(i + 1) % 8];
    const end = toward(v, next);
    shape.quadraticCurveTo(v.x, v.y, end.x, end.y);
    const nextStart = toward(next, v);
    const control = end.clone().add(nextStart).multiplyScalar(0.5);
    control.addScaledVector(control.clone().normalize(), convexity * 2);
    shape.quadraticCurveTo(control.x, control.y, nextStart.x, nextStart.y);
  }
  shape.closePath();
  const raw = new ExtrudeGeometry(shape, {
    depth: 3.25, steps: 1, curveSegments: 12,
    bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel,
    bevelSegments: 6,
  });
  raw.center();
  raw.rotateY(Math.PI / 2);
  raw.deleteAttribute('normal');
  raw.deleteAttribute('uv');
  raw.clearGroups();
  const geometry = mergeVertices(raw);
  geometry.computeVertexNormals();
  raw.dispose();
  return geometry;
}
