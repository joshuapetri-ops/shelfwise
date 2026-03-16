/**
 * Encode a criteria object/array into a base64 string.
 * Uses TextEncoder to handle non-ASCII characters (emoji, etc).
 *
 * @param {*} criteria - The criteria to encode (object or array).
 * @returns {string} Base64-encoded JSON string.
 */
export function encodeCriteria(criteria) {
  const json = JSON.stringify(criteria);
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }
  return btoa(binary);
}

/**
 * Decode a base64-encoded criteria string back into its original form.
 * Uses TextDecoder to handle non-ASCII characters (emoji, etc).
 *
 * @param {string} code - Base64-encoded JSON string.
 * @returns {*|null} The decoded criteria, or null if decoding fails.
 */
export function decodeCriteria(code) {
  try {
    const binary = atob(code);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const json = new TextDecoder().decode(bytes);
    return JSON.parse(json);
  } catch {
    return null;
  }
}
