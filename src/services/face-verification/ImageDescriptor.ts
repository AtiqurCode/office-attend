import * as ImageManipulator from 'expo-image-manipulator';
import jpeg from 'jpeg-js';

import { cosineSimilarity } from '@/services/face-verification/types';

export const IMAGE_DESCRIPTOR_SIZE = 48;
/** Grayscale pixels + 8-bin histogram. */
export const IMAGE_DESCRIPTOR_DIMS = IMAGE_DESCRIPTOR_SIZE * IMAGE_DESCRIPTOR_SIZE + 8;

const SIZE = IMAGE_DESCRIPTOR_SIZE;

function base64ToBytes(base64: string): Uint8Array {
  const cleaned = base64.replace(/^data:image\/\w+;base64,/, '');
  if (typeof atob !== 'function') {
    throw new Error('Base64 decode unavailable on this runtime.');
  }
  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Build a real, deterministic grayscale descriptor from a selfie.
 * Works in Expo Go (no native face SDK). Weaker than MobileFaceNet,
 * but compares enrolled vs live capture — never invents random scores.
 */
export async function extractImageDescriptor(imageUri: string): Promise<number[]> {
  const manipulated = await ImageManipulator.manipulateAsync(
    imageUri,
    [{ resize: { width: SIZE, height: SIZE } }],
    {
      compress: 0.7,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    }
  );

  if (!manipulated.base64) {
    throw new Error('Could not read image pixels for face descriptor.');
  }

  const raw = base64ToBytes(manipulated.base64);
  const decoded = jpeg.decode(raw, { useTArray: true, maxResolutionInMP: 5 });
  const { data, width, height } = decoded;
  if (!data?.length || !width || !height) {
    throw new Error('JPEG decode failed for face descriptor.');
  }

  const gray: number[] = [];
  for (let i = 0; i < data.length; i += 4) {
    // ITU-R BT.601 luma
    gray.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
  }

  // Local contrast normalize (mean/std)
  const mean = gray.reduce((a, b) => a + b, 0) / gray.length;
  let variance = 0;
  for (const v of gray) variance += (v - mean) ** 2;
  const std = Math.sqrt(variance / gray.length) || 1;
  const normalized = gray.map((v) => (v - mean) / std);

  // Append coarse 8-bin histogram for lighting robustness
  const bins = new Array(8).fill(0);
  for (const v of gray) {
    const idx = Math.min(7, Math.floor((v / 256) * 8));
    bins[idx] += 1;
  }
  const binSum = bins.reduce((a: number, b: number) => a + b, 0) || 1;
  const hist = bins.map((b: number) => b / binSum);

  const vector = [...normalized, ...hist];
  // L2 normalize full vector
  let norm = 0;
  for (const v of vector) norm += v * v;
  norm = Math.sqrt(norm) || 1;
  return vector.map((v) => v / norm);
}

export function descriptorSimilarity(a: number[], b: number[]): number {
  return cosineSimilarity(a, b);
}

/** Typical same-person selfies land ~0.85–0.98; different people much lower. */
export const IMAGE_DESCRIPTOR_MATCH_THRESHOLD = 0.82;

/** Minimum change between eye-challenge frames (blink / motion). */
export const EYE_FRAME_DIFFERENCE_MIN = 0.04;
