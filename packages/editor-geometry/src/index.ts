/**
 * `@eraser/editor-geometry` — pure 2D math for the Graphora editor.
 *
 * No React, no DOM. Every function is side-effect free.
 */
export { EPSILON, approxEquals, clamp, isFiniteNumber } from "./epsilon.js";
export {
  add,
  angleOf,
  createPoint,
  cross,
  distance,
  distanceSquared,
  dot,
  lerp,
  length,
  lengthSquared,
  midpoint,
  normalize,
  pointsEqual,
  rotatePoint,
  scale,
  subtract,
  translatePoint,
  vectorFromAngle,
} from "./primitives/point.js";
export {
  boundsCenter,
  boundsIntersect,
  boundsOfPointCloud,
  boundsOfRect,
  boundsSize,
  boundsToRect,
  inflateBounds,
  normalizeRect,
  pointInBounds,
  rectToBounds,
  translateBounds,
  unionAllBounds,
  unionBounds,
} from "./primitives/rect.js";
export {
  closestPointOnSegment,
  distancePointToSegment,
  isDegenerateSegment,
} from "./primitives/segment.js";
export type { Segment } from "./primitives/segment.js";
export {
  lineFromPoints,
  lineIntersection as primitiveLineIntersection,
} from "./primitives/line.js";
export type { Line } from "./primitives/line.js";
export { boundsOfPoints, pointInPolygon, polygonBounds } from "./primitives/polygon.js";
export {
  applyMatrix,
  identityMatrix,
  invertMatrix,
  multiplyMatrices,
  rotationMatrix,
  scaleMatrix,
  translationMatrix,
} from "./primitives/matrix.js";
export type { Matrix } from "./primitives/matrix.js";
export {
  DEFAULT_SNAP_INCREMENT_DEG,
  degToRad,
  normalizeAngleDeg,
  radToDeg,
  rotatePointDeg,
  snapAngleDeg,
} from "./transforms/rotation.js";
export { MIN_RESIZE_SIZE, resizeRect } from "./transforms/resize.js";
export type { ResizeOptions } from "./transforms/resize.js";
export {
  DEFAULT_HANDLE_SIZE,
  RESIZE_HANDLE_IDS,
  ROTATION_HANDLE_GAP,
  getResizeHandlePosition,
  getRotationHandlePosition,
  hitResizeHandle,
  hitRotationHandle,
} from "./handles.js";
export type { ResizeHandleId } from "./handles.js";
export {
  getRectCorners,
  getRotatedBounds,
  getRotatedCorners,
  rectCenter,
} from "./bounds/element-bounds.js";
export { lineIntersection, rectIntersection, segmentIntersection } from "./intersections/index.js";
export {
  pointInDiamond,
  pointInEllipse,
  pointInRect,
  pointNearPolyline,
} from "./hit-testing/hit.js";
