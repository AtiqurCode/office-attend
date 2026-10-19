import { FaceVerificationStatuses } from '@/constants/status';
import {
  cosineSimilarity,
  DEFAULT_FACE_MATCH_THRESHOLD,
  type FaceDetectionService,
  type FaceVerificationProvider,
  type FaceVerificationResult,
} from '@/services/face-verification/types';

/**
 * Real on-device face matching via embeddings.
 * Never invents scores when the native module or enrollment is missing.
 */
export class OnDeviceFaceMatchProvider implements FaceVerificationProvider {
  readonly providerName = 'on-device-embedding-match';

  constructor(
    private readonly detection: FaceDetectionService,
    private readonly threshold = DEFAULT_FACE_MATCH_THRESHOLD
  ) {}

  async isAvailable(): Promise<boolean> {
    return this.detection.isAvailable();
  }

  async enrollFromImage(imageUri: string): Promise<number[] | null> {
    if (this.detection.extractEmbedding) {
      return this.detection.extractEmbedding(imageUri);
    }
    const detected = await this.detection.detectInImage(imageUri);
    return detected.embedding ?? null;
  }

  async verifyAgainstEnrollment(params: {
    captureUri: string;
    referenceUri: string | null;
    referenceEmbedding: number[] | null;
    employeeId: string;
  }): Promise<FaceVerificationResult> {
    const available = await this.isAvailable();
    if (!available) {
      return {
        status: FaceVerificationStatuses.UNAVAILABLE,
        message:
          'Face recognition requires a development build with an on-device face module. Use PIN for now.',
      };
    }

    let reference = params.referenceEmbedding;
    if ((!reference || reference.length === 0) && params.referenceUri) {
      reference = (await this.enrollFromImage(params.referenceUri)) ?? null;
    }
    if (!reference || reference.length === 0) {
      return {
        status: FaceVerificationStatuses.UNAVAILABLE,
        message: 'No face enrollment on file for this employee. Ask an admin to enroll a face.',
      };
    }

    const probe = await this.enrollFromImage(params.captureUri);
    if (!probe || probe.length === 0) {
      return {
        status: FaceVerificationStatuses.REJECTED,
        message: 'Could not extract a face embedding from the capture.',
      };
    }

    const score = cosineSimilarity(reference, probe);
    if (score >= this.threshold) {
      return {
        status: FaceVerificationStatuses.VERIFIED,
        message: `Face matched (similarity ${score.toFixed(3)}).`,
        score,
      };
    }

    return {
      status: FaceVerificationStatuses.REJECTED,
      message: `Face did not match enrolled template (similarity ${score.toFixed(3)}; need ≥ ${this.threshold}).`,
      score,
    };
  }
}
