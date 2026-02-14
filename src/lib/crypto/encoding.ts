// Production-grade helper functions: Handle binary and string conversions
export const Encoding = {
  // String to Uint8Array
  utf8ToBytes: (str: string): Uint8Array => new TextEncoder().encode(str),

  // Uint8Array to Hex String
  bytesToHex: (bytes: Uint8Array): string => {
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  },

  // Hex String to Uint8Array
  hexToBytes: (hex: string): Uint8Array => {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes;
  }
};