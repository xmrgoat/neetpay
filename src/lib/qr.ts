/**
 * Minimal QR code generator — produces SVG markup.
 * Zero dependencies, implements QR Code Model 2 (ISO 18004).
 * Supports Byte mode, error correction level L, versions 1-10.
 */

// ─── Galois field GF(256) arithmetic ────────────────────────────
const EXP = new Uint8Array(256);
const LOG = new Uint8Array(256);
{
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x = x << 1;
    if (x & 256) x ^= 0x11d;
  }
  EXP[255] = EXP[0];
}

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP[(LOG[a] + LOG[b]) % 255];
}

function polyMul(a: number[], b: number[]): number[] {
  const result = new Array(a.length + b.length - 1).fill(0);
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < b.length; j++) {
      result[i + j] ^= gfMul(a[i], b[j]);
    }
  }
  return result;
}

function polyMod(dividend: number[], divisor: number[]): number[] {
  const result = dividend.slice();
  for (let i = 0; i <= result.length - divisor.length; i++) {
    if (result[i] === 0) continue;
    const coeff = result[i];
    for (let j = 1; j < divisor.length; j++) {
      result[i + j] ^= gfMul(divisor[j], coeff);
    }
  }
  return result.slice(dividend.length - divisor.length + 1);
}

function generatorPoly(ecLen: number): number[] {
  let g = [1];
  for (let i = 0; i < ecLen; i++) {
    g = polyMul(g, [1, EXP[i]]);
  }
  return g;
}

// ─── QR version/capacity tables (L correction) ─────────────────
// Data codewords capacity for versions 1-10, error correction L
const DATA_CODEWORDS_L = [
  0, 19, 34, 55, 80, 108, 136, 156, 194, 232, 274,
];
const EC_CODEWORDS_L = [
  0, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18,
];
// Total codewords (data + EC) per version — used for validation
// const TOTAL_CODEWORDS = [0, 26, 44, 70, 100, 134, 172, 196, 242, 292, 346];
// Number of EC blocks for versions 1-10
const EC_BLOCKS_L = [
  0, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4,
];

// Alignment pattern locations per version
const ALIGNMENT_POSITIONS: number[][] = [
  [], [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34],
  [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50],
];

function getVersion(dataLen: number): number {
  // Data needs: 4 bits mode + 8/16 bit length + data + 4 bit terminator
  for (let v = 1; v <= 10; v++) {
    const charCountBits = v <= 9 ? 8 : 16;
    const totalBits = 4 + charCountBits + dataLen * 8;
    const totalBytes = Math.ceil(totalBits / 8);
    if (totalBytes <= DATA_CODEWORDS_L[v]) return v;
  }
  throw new Error("Data too long for QR versions 1-10");
}

function moduleCount(version: number): number {
  return 17 + version * 4;
}

// ─── Encode data ────────────────────────────────────────────────
function encodeData(data: string, version: number): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < data.length; i++) {
    bytes.push(data.charCodeAt(i) & 0xff);
  }

  const charCountBits = version <= 9 ? 8 : 16;
  const dataCap = DATA_CODEWORDS_L[version];
  const bits: number[] = [];

  function pushBits(val: number, len: number) {
    for (let i = len - 1; i >= 0; i--) {
      bits.push((val >> i) & 1);
    }
  }

  // Mode indicator: Byte (0100)
  pushBits(0b0100, 4);
  // Character count
  pushBits(bytes.length, charCountBits);
  // Data bytes
  for (const b of bytes) pushBits(b, 8);
  // Terminator (up to 4 bits)
  const termLen = Math.min(4, dataCap * 8 - bits.length);
  pushBits(0, termLen);
  // Byte-align
  while (bits.length % 8 !== 0) bits.push(0);
  // Pad bytes
  const padBytes = [0xec, 0x11];
  let padIdx = 0;
  while (bits.length < dataCap * 8) {
    pushBits(padBytes[padIdx % 2], 8);
    padIdx++;
  }

  const codewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | bits[i + j];
    codewords.push(byte);
  }

  return codewords;
}

// ─── Error correction ───────────────────────────────────────────
function computeEC(dataCodewords: number[], version: number): number[] {
  const numBlocks = EC_BLOCKS_L[version];
  const totalData = DATA_CODEWORDS_L[version];
  const ecPerBlock = EC_CODEWORDS_L[version];
  const gen = generatorPoly(ecPerBlock);

  const blockSize = Math.floor(totalData / numBlocks);
  const largerBlocks = totalData % numBlocks;
  const dataBlocks: number[][] = [];
  const ecBlocks: number[][] = [];

  let offset = 0;
  for (let i = 0; i < numBlocks; i++) {
    const size = blockSize + (i >= numBlocks - largerBlocks ? 1 : 0);
    const block = dataCodewords.slice(offset, offset + size);
    dataBlocks.push(block);
    offset += size;

    // Compute EC for this block
    const padded = [...block, ...new Array(ecPerBlock).fill(0)];
    const ec = polyMod(padded, gen);
    ecBlocks.push(ec);
  }

  // Interleave data blocks
  const result: number[] = [];
  const maxDataLen = blockSize + (largerBlocks > 0 ? 1 : 0);
  for (let i = 0; i < maxDataLen; i++) {
    for (let j = 0; j < numBlocks; j++) {
      if (i < dataBlocks[j].length) result.push(dataBlocks[j][i]);
    }
  }
  // Interleave EC blocks
  for (let i = 0; i < ecPerBlock; i++) {
    for (let j = 0; j < numBlocks; j++) {
      result.push(ecBlocks[j][i]);
    }
  }

  return result;
}

// ─── Matrix construction ────────────────────────────────────────
type Matrix = (number | null)[][];

function createMatrix(size: number): Matrix {
  return Array.from({ length: size }, () => new Array(size).fill(null));
}

function placeFinderPattern(matrix: Matrix, row: number, col: number) {
  for (let r = -1; r <= 7; r++) {
    for (let c = -1; c <= 7; c++) {
      const mr = row + r;
      const mc = col + c;
      if (mr < 0 || mr >= matrix.length || mc < 0 || mc >= matrix.length) continue;
      if (r === -1 || r === 7 || c === -1 || c === 7) {
        matrix[mr][mc] = 0; // separator
      } else if (
        (r === 0 || r === 6) ||
        (c === 0 || c === 6) ||
        (r >= 2 && r <= 4 && c >= 2 && c <= 4)
      ) {
        matrix[mr][mc] = 1; // dark
      } else {
        matrix[mr][mc] = 0; // light
      }
    }
  }
}

function placeAlignmentPattern(matrix: Matrix, row: number, col: number) {
  for (let r = -2; r <= 2; r++) {
    for (let c = -2; c <= 2; c++) {
      const mr = row + r;
      const mc = col + c;
      if (matrix[mr][mc] !== null) continue; // don't overwrite finder patterns
      if (Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0)) {
        matrix[mr][mc] = 1;
      } else {
        matrix[mr][mc] = 0;
      }
    }
  }
}

function placeTimingPatterns(matrix: Matrix) {
  const size = matrix.length;
  for (let i = 8; i < size - 8; i++) {
    if (matrix[6][i] === null) matrix[6][i] = i % 2 === 0 ? 1 : 0;
    if (matrix[i][6] === null) matrix[i][6] = i % 2 === 0 ? 1 : 0;
  }
}

function reserveFormatBits(matrix: Matrix) {
  const size = matrix.length;
  // Around top-left finder
  for (let i = 0; i <= 8; i++) {
    if (matrix[8][i] === null) matrix[8][i] = 0;
    if (matrix[i][8] === null) matrix[i][8] = 0;
  }
  // Around top-right finder
  for (let i = 0; i <= 7; i++) {
    if (matrix[8][size - 1 - i] === null) matrix[8][size - 1 - i] = 0;
  }
  // Around bottom-left finder
  for (let i = 0; i <= 7; i++) {
    if (matrix[size - 1 - i][8] === null) matrix[size - 1 - i][8] = 0;
  }
  // Dark module
  matrix[size - 8][8] = 1;
}

// Format info for mask 0-7, EC level L
const FORMAT_INFO_L = [
  0x77c4, 0x72f3, 0x7daa, 0x789d, 0x662f, 0x6318, 0x6c41, 0x6976,
  0x5412, 0x5125, 0x5e7c, 0x5b4b, 0x45f9, 0x40ce, 0x4f97, 0x4aa0,
];

function placeFormatInfo(matrix: Matrix, mask: number) {
  const size = matrix.length;
  const info = FORMAT_INFO_L[mask];

  // 15 format bits placed in two copies around finder patterns
  const bits: number[] = [];
  for (let i = 14; i >= 0; i--) bits.push((info >> i) & 1);

  // Top-left: row 8
  const tlCols = [0, 1, 2, 3, 4, 5, 7, 8];
  for (let i = 0; i < 8; i++) matrix[8][tlCols[i]] = bits[i];
  // Top-left: col 8
  const tlRows = [8, 7, 5, 4, 3, 2, 1, 0];
  for (let i = 0; i < 7; i++) matrix[tlRows[i + 1]][8] = bits[8 + i];

  // Top-right: row 8
  for (let i = 0; i < 8; i++) matrix[8][size - 8 + i] = bits[14 - i];
  // Bottom-left: col 8
  for (let i = 0; i < 7; i++) matrix[size - 7 + i][8] = bits[i];
  // Ensure dark module
  matrix[size - 8][8] = 1;
}

function placeData(matrix: Matrix, data: number[]): void {
  const size = matrix.length;
  const bits: number[] = [];
  for (const byte of data) {
    for (let i = 7; i >= 0; i--) bits.push((byte >> i) & 1);
  }

  let bitIndex = 0;
  let upward = true;
  let col = size - 1;

  while (col > 0) {
    if (col === 6) col--; // skip timing column

    for (let row = 0; row < size; row++) {
      const actualRow = upward ? size - 1 - row : row;
      for (const offset of [0, -1]) {
        const c = col + offset;
        if (c < 0) continue;
        if (matrix[actualRow][c] !== null) continue;
        matrix[actualRow][c] = bitIndex < bits.length ? bits[bitIndex++] : 0;
      }
    }
    upward = !upward;
    col -= 2;
  }
}

// Mask functions
const MASK_FNS: Array<(r: number, c: number) => boolean> = [
  (r, c) => (r + c) % 2 === 0,
  (r) => r % 2 === 0,
  (_r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
];

function isReserved(matrix: Matrix, version: number, row: number, col: number): boolean {
  const size = matrix.length;
  // Finder + separator regions
  if (row <= 8 && col <= 8) return true;
  if (row <= 8 && col >= size - 8) return true;
  if (row >= size - 8 && col <= 8) return true;
  // Timing
  if (row === 6 || col === 6) return true;
  // Dark module
  if (row === size - 8 && col === 8) return true;
  // Alignment patterns
  const positions = ALIGNMENT_POSITIONS[version] || [];
  for (const pr of positions) {
    for (const pc of positions) {
      // Skip alignment patterns that overlap with finder patterns
      if (pr <= 8 && pc <= 8) continue;
      if (pr <= 8 && pc >= size - 8) continue;
      if (pr >= size - 8 && pc <= 8) continue;
      if (Math.abs(row - pr) <= 2 && Math.abs(col - pc) <= 2) return true;
    }
  }
  return false;
}

function applyMask(matrix: Matrix, version: number, maskIndex: number): Matrix {
  const size = matrix.length;
  const masked = matrix.map((row) => [...row]);
  const fn = MASK_FNS[maskIndex];

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!isReserved(matrix, version, r, c) && fn(r, c)) {
        masked[r][c] = masked[r][c] === 1 ? 0 : 1;
      }
    }
  }
  return masked;
}

function scoreMask(matrix: Matrix): number {
  const size = matrix.length;
  let score = 0;

  // Rule 1: runs of same color
  for (let r = 0; r < size; r++) {
    let run = 1;
    for (let c = 1; c < size; c++) {
      if (matrix[r][c] === matrix[r][c - 1]) {
        run++;
      } else {
        if (run >= 5) score += 3 + (run - 5);
        run = 1;
      }
    }
    if (run >= 5) score += 3 + (run - 5);
  }
  for (let c = 0; c < size; c++) {
    let run = 1;
    for (let r = 1; r < size; r++) {
      if (matrix[r][c] === matrix[r - 1][c]) {
        run++;
      } else {
        if (run >= 5) score += 3 + (run - 5);
        run = 1;
      }
    }
    if (run >= 5) score += 3 + (run - 5);
  }

  // Rule 2: 2x2 blocks
  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      const v = matrix[r][c];
      if (v === matrix[r][c + 1] && v === matrix[r + 1][c] && v === matrix[r + 1][c + 1]) {
        score += 3;
      }
    }
  }

  // Simplified: skip rules 3 and 4 for performance
  return score;
}

function buildMatrix(data: number[], version: number): Matrix {
  const size = moduleCount(version);
  const matrix = createMatrix(size);

  // Place function patterns
  placeFinderPattern(matrix, 0, 0);
  placeFinderPattern(matrix, 0, size - 7);
  placeFinderPattern(matrix, size - 7, 0);

  // Alignment patterns
  const positions = ALIGNMENT_POSITIONS[version] || [];
  for (const r of positions) {
    for (const c of positions) {
      if (r <= 8 && c <= 8) continue;
      if (r <= 8 && c >= size - 8) continue;
      if (r >= size - 8 && c <= 8) continue;
      placeAlignmentPattern(matrix, r, c);
    }
  }

  placeTimingPatterns(matrix);
  reserveFormatBits(matrix);
  placeData(matrix, data);

  // Try all 8 masks, pick the best
  let bestMask = 0;
  let bestScore = Infinity;
  for (let m = 0; m < 8; m++) {
    const masked = applyMask(matrix, version, m);
    const s = scoreMask(masked);
    if (s < bestScore) {
      bestScore = s;
      bestMask = m;
    }
  }

  const final = applyMask(matrix, version, bestMask);
  placeFormatInfo(final, bestMask);
  return final;
}

// ─── Public API ─────────────────────────────────────────────────

/**
 * Generate a QR code as an SVG string.
 * @param text - The string to encode
 * @param size - SVG width/height in pixels (default 256)
 * @param darkColor - Module color (default "currentColor")
 * @param lightColor - Background color (default "transparent")
 */
export function generateQrSvg(
  text: string,
  size = 256,
  darkColor = "currentColor",
  lightColor = "transparent",
): string {
  const version = getVersion(text.length);
  const dataCodewords = encodeData(text, version);
  const fullData = computeEC(dataCodewords, version);
  const matrix = buildMatrix(fullData, version);
  const modules = matrix.length;
  const quiet = 2; // quiet zone modules
  const totalModules = modules + quiet * 2;
  const cellSize = size / totalModules;

  let paths = "";
  for (let r = 0; r < modules; r++) {
    for (let c = 0; c < modules; c++) {
      if (matrix[r][c] === 1) {
        const x = (c + quiet) * cellSize;
        const y = (r + quiet) * cellSize;
        paths += `M${x},${y}h${cellSize}v${cellSize}h-${cellSize}z`;
      }
    }
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" shape-rendering="crispEdges">`,
    `<rect width="${size}" height="${size}" fill="${lightColor}"/>`,
    `<path d="${paths}" fill="${darkColor}"/>`,
    `</svg>`,
  ].join("");
}
