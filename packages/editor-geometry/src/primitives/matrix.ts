/**
 * 2D affine transforms as `{ a, b, c, d, e, f }` with
 * `x' = a*x + c*y + e`, `y' = b*x + d*y + f`.
 * Pure value objects; composition order is `multiply(m1, m2)` = apply `m2`
 * first, then `m1`.
 */
import type { Point } from "@eraser/shared-types";
import { EPSILON } from "../epsilon.js";

/** 2D affine matrix. */
export interface Matrix {
  readonly a: number;
  readonly b: number;
  readonly c: number;
  readonly d: number;
  readonly e: number;
  readonly f: number;
}

/** Identity transform. */
export function identityMatrix(): Matrix {
  return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
}

/** Translation by `(dx, dy)`. */
export function translationMatrix(dx: number, dy: number): Matrix {
  return { a: 1, b: 0, c: 0, d: 1, e: dx, f: dy };
}

/** Scale by `(sx, sy)`, optionally about `origin`. */
export function scaleMatrix(sx: number, sy: number, origin?: Point): Matrix {
  if (origin === undefined) return { a: sx, b: 0, c: 0, d: sy, e: 0, f: 0 };
  return {
    a: sx,
    b: 0,
    c: 0,
    d: sy,
    e: origin.x - sx * origin.x,
    f: origin.y - sy * origin.y,
  };
}

/** Counter-clockwise rotation by `angleRad`, optionally about `origin`. */
export function rotationMatrix(angleRad: number, origin?: Point): Matrix {
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  if (origin === undefined) return { a: cos, b: sin, c: -sin, d: cos, e: 0, f: 0 };
  return {
    a: cos,
    b: sin,
    c: -sin,
    d: cos,
    e: origin.x - cos * origin.x + sin * origin.y,
    f: origin.y - sin * origin.x - cos * origin.y,
  };
}

/** Compose: apply `m2` first, then `m1`. */
export function multiplyMatrices(m1: Matrix, m2: Matrix): Matrix {
  return {
    a: m1.a * m2.a + m1.c * m2.b,
    b: m1.b * m2.a + m1.d * m2.b,
    c: m1.a * m2.c + m1.c * m2.d,
    d: m1.b * m2.c + m1.d * m2.d,
    e: m1.a * m2.e + m1.c * m2.f + m1.e,
    f: m1.b * m2.e + m1.d * m2.f + m1.f,
  };
}

/** Apply a matrix to a point. */
export function applyMatrix(m: Matrix, p: Point): Point {
  return {
    x: m.a * p.x + m.c * p.y + m.e,
    y: m.b * p.x + m.d * p.y + m.f,
  };
}

/** Inverse matrix, or `undefined` when singular (zero determinant). */
export function invertMatrix(m: Matrix): Matrix | undefined {
  const det = m.a * m.d - m.b * m.c;
  if (Math.abs(det) <= EPSILON) return undefined;
  const inv = 1 / det;
  return {
    a: m.d * inv,
    b: -m.b * inv,
    c: -m.c * inv,
    d: m.a * inv,
    e: (m.c * m.f - m.d * m.e) * inv,
    f: (m.b * m.e - m.a * m.f) * inv,
  };
}
