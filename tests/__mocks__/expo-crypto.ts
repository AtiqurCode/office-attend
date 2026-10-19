export const CryptoDigestAlgorithm = {
  SHA256: 'SHA-256',
};

export async function digestStringAsync(
  _algorithm: string,
  data: string
): Promise<string> {
  // Deterministic stub for Jest (not cryptographic).
  let h = 0;
  for (let i = 0; i < data.length; i++) {
    h = (Math.imul(31, h) + data.charCodeAt(i)) | 0;
  }
  return `sha256:${h}:${data.length}`;
}

export function randomUUID(): string {
  return '00000000-0000-4000-8000-000000000001';
}
