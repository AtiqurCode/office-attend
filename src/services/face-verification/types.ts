import type { FaceDetectionStatus, FaceVerificationStatus } from '@/constants/status';

export interface FaceBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FaceDetectionResult {
  status: FaceDetectionStatus;
  faceCount: number;
  bounds?: FaceBounds;
  isCentered?: boolean;
  isLargeEnough?: boolean;
  embedding?: number[];
  leftEyeOpenProbability?: number;
  rightEyeOpenProbability?: number;
  message: string;
}

export interface FaceVerificationResult {
  status: FaceVerificationStatus;
  message: string;
  score?: number;
}

export interface FaceDetectionService {
  readonly providerName: string;
  isAvailable(): Promise<boolean>;
  detectInImage(imageUri: string): Promise<FaceDetectionResult>;
  extractEmbedding?(imageUri: string): Promise<number[] | null>;
}

/**
 * Face matching contract. Implementations must never invent match scores.
 */
export interface FaceVerificationProvider {
  readonly providerName: string;
  isAvailable(): Promise<boolean>;
  verifyAgainstEnrollment(params: {
    captureUri: string;
    referenceUri: string | null;
    referenceEmbedding: number[] | null;
    employeeId: string;
  }): Promise<FaceVerificationResult>;
  enrollFromImage?(imageUri: string): Promise<number[] | null>;
}

export interface EyeLivenessResult {
  ok: boolean;
  blinked: boolean;
  eyesOpen: boolean;
  message: string;
}

export interface EyeLivenessProvider {
  readonly providerName: string;
  isAvailable(): Promise<boolean>;
  /**
   * Evaluate eye liveness from one or more capture analyses.
   * Not medical iris recognition — blink / eyes-open assist only.
   * Optional imageUris enable frame-difference fallback when landmarks are unavailable.
   */
  evaluate(
    samples: FaceDetectionResult[],
    imageUris?: string[]
  ): Promise<EyeLivenessResult>;
}

/** Cosine similarity for L2-normalized (or raw) embeddings. */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export const DEFAULT_FACE_MATCH_THRESHOLD = 0.72;
