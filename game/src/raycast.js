// 2D raycasting against axis-aligned rectangles: the guard and camera vision cones are cut
// by walls and pillars, so sight never passes through a solid edge.

/** Turn a rectangle into its four edge segments. */
export function rectSegments(rect) {
  const { x, y, w, h } = rect;
  return [
    { x1: x, y1: y, x2: x + w, y2: y },
    { x1: x + w, y1: y, x2: x + w, y2: y + h },
    { x1: x + w, y1: y + h, x2: x, y2: y + h },
    { x1: x, y1: y + h, x2: x, y2: y },
  ];
}

export function solidsSegments(solids) {
  const out = [];
  for (const rect of solids) out.push(...rectSegments(rect));
  return out;
}

/**
 * Distance along the ray (origin + t * dir, t >= 0) to the first hit on segment s, or Infinity.
 * Uses the standard parametric cross-product test; parallel lines never intersect.
 */
export function raySegment(origin, dir, s) {
  const rx = dir.x;
  const ry = dir.y;
  const sx = s.x2 - s.x1;
  const sy = s.y2 - s.y1;
  const denom = rx * sy - ry * sx;
  if (Math.abs(denom) < 1e-9) return Infinity;
  const qpx = s.x1 - origin.x;
  const qpy = s.y1 - origin.y;
  const t = (qpx * sy - qpy * sx) / denom;
  const u = (qpx * ry - qpy * rx) / denom;
  if (t < 0 || u < 0 || u > 1) return Infinity;
  return t;
}

/** Distance from origin along `angle` to the nearest solid, capped at maxDist. */
export function castRay(origin, angle, segments, maxDist) {
  const dir = { x: Math.cos(angle), y: Math.sin(angle) };
  let best = maxDist;
  for (const s of segments) {
    const t = raySegment(origin, dir, s);
    // Ignore a hit at the origin itself: an emitter mounted flush on a wall edge
    // would otherwise clip its own cone to zero length.
    if (t > 0.5 && t < best) best = t;
  }
  return best;
}

/**
 * The visible cone as a polygon: the origin plus one point per ray across the field of view.
 * A small angular step keeps the cut edge crisp where a wall slices the cone.
 */
export function conePolygon(origin, angle, fov, range, segments) {
  const step = (2.5 * Math.PI) / 180;
  const points = [{ x: origin.x, y: origin.y }];
  for (let a = angle - fov / 2; a <= angle + fov / 2 + 1e-6; a += step) {
    const d = castRay(origin, a, segments, range);
    points.push({ x: origin.x + Math.cos(a) * d, y: origin.y + Math.sin(a) * d });
  }
  return points;
}

/** True when the straight line from a to b meets no solid segment before reaching b. */
export function losClear(a, b, segments) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 1e-6) return true;
  const dir = { x: dx / dist, y: dy / dist };
  for (const s of segments) {
    const t = raySegment(a, dir, s);
    if (t < dist - 0.5) return false;
  }
  return true;
}

/** True when point p lies within range and inside the facing wedge of `origin`. */
export function inWedge(origin, angle, fov, range, p) {
  const dx = p.x - origin.x;
  const dy = p.y - origin.y;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return false;
  let diff = Math.atan2(dy, dx) - angle;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  return Math.abs(diff) <= fov / 2;
}

/** Shortest distance from point p to segment s (for click and hover hit tests). */
export function pointSegmentDistance(p, s) {
  const dx = s.x2 - s.x1;
  const dy = s.y2 - s.y1;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((p.x - s.x1) * dx + (p.y - s.y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = s.x1 + t * dx;
  const cy = s.y1 + t * dy;
  return Math.hypot(p.x - cx, p.y - cy);
}
