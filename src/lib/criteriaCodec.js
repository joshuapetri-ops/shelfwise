/**
 * Encode a criteria object/array into a base64 string.
 *
 * @param {*} criteria - The criteria to encode (object or array).
 * @returns {string} Base64-encoded JSON string.
 */
export function encodeCriteria(criteria) {
  return btoa(JSON.stringify(criteria));
}

/**
 * Decode a base64-encoded criteria string back into its original form.
 *
 * @param {string} code - Base64-encoded JSON string.
 * @returns {*|null} The decoded criteria, or null if decoding fails.
 */
export function decodeCriteria(code) {
  try {
    return JSON.parse(atob(code));
  } catch {
    return null;
  }
}
