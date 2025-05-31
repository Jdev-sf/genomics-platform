// lib/setup-bigint-serialization.ts
// Setup global BigInt serialization for JSON

// Fix BigInt serialization globally
if (typeof BigInt !== 'undefined' && !(BigInt.prototype as any).toJSON) {
  (BigInt.prototype as any).toJSON = function() {
    return this.toString();
  };
}

// Export for explicit import if needed
export function setupBigIntSerialization() {
  if (typeof BigInt !== 'undefined' && !(BigInt.prototype as any).toJSON) {
    (BigInt.prototype as any).toJSON = function() {
      return this.toString();
    };
  }
}

// Auto-setup on import
setupBigIntSerialization();