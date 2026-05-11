import { createHash } from 'crypto';

/**
 * Canonicalization rules per formal semantics §3
 * - UTF-8 only
 * - Ordered object keys
 * - No NaN, Infinity, undefined
 * - Deterministic numeric encoding
 * - Deterministic timestamp precision
 */

export interface CanonicalValue {
  [key: string]: any;
}

/**
 * Check if a value is canonical (satisfies all requirements)
 */
export function isCanonical(value: any): boolean {
  if (value === null) return true;
  if (typeof value === 'boolean') return true;
  if (typeof value === 'string') {
    try {
      // Validate UTF-8
      Buffer.from(value, 'utf8');
      return true;
    } catch {
      return false;
    }
  }
  if (typeof value === 'number') {
    if (Number.isNaN(value)) return false;
    if (!Number.isFinite(value)) return false;
    return true;
  }
  if (Array.isArray(value)) {
    return value.every(isCanonical);
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return keys.every(k => isCanonical(value[k]));
  }
  return false; // undefined, symbols, functions
}

/**
 * Canonicalize a value - convert to canonical form
 * Returns a deep copy that satisfies canonicalization rules
 */
export function canonicalize(value: any): any {
  if (value === null) return null;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    // Validate UTF-8
    Buffer.from(value, 'utf8');
    return value;
  }
  if (typeof value === 'number') {
    if (Number.isNaN(value) || !Number.isFinite(value)) {
      throw new Error(
        `Cannot canonicalize non-finite number: ${value}`
      );
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (typeof value === 'object' && value !== null) {
    const canonical: CanonicalValue = {};
    const keys = Object.keys(value).sort();
    for (const key of keys) {
      const v = value[key];
      if (v !== undefined) {
        canonical[key] = canonicalize(v);
      }
    }
    return canonical;
  }
  throw new Error(`Cannot canonicalize value: ${typeof value}`);
}

/**
 * Serialize to canonical byte representation
 * Produces deterministic output per formal semantics §2
 */
export function canonicalBytes(value: any): Buffer {
  const canonical = canonicalize(value);
  const json = JSON.stringify(canonical, null, 0);
  return Buffer.from(json, 'utf8');
}

/**
 * State commitment function: SHA256 hash
 * Per formal semantics §4: H_s(S) = SHA256(C(S))
 */
export function stateHash(state: CanonicalValue): string {
  const bytes = canonicalBytes(state);
  return createHash('sha256').update(bytes).digest('hex');
}

/**
 * Event hash - hash of canonical event representation
 */
export function eventHash(event: any): string {
  const bytes = canonicalBytes(event);
  return createHash('sha256').update(bytes).digest('hex');
}
