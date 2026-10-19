import { FaceVerificationStatuses } from '@/constants/status';
import {
  descriptorSimilarity,
  extractImageDescriptor,
  IMAGE_DESCRIPTOR_DIMS,
  IMAGE_DESCRIPTOR_MATCH_THRESHOLD,
} from '@/services/face-verification/ImageDescriptor';
import type {
  FaceVerificationProvider,
  FaceVerificationResult,
} from '@/services/face-verification/types';

/**
 * Expo Go–compatible face match: real pixel descriptor from selfie vs enrollment.
 * Weaker than MobileFaceNet, but never invents scores.
 */
export class ImageDescriptorFaceMatchProvider implements FaceVerificationProvider {
  readonly providerName = 'image-descriptor-match';

  constructor(private readonly threshold = IMAGE_DESCRIPTOR_MATCH_THRESHOLD) {}

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async enrollFromImage(imageUri: string): Promise<number[] | null> {
    try {
      return await extractImageDescriptor(imageUri);
    } catch {
      return null;
    }
  }

  async verifyAgainstEnrollment(params: {
    captureUri: string;
    referenceUri: string | null;
    referenceEmbedding: number[] | null;
    employeeId: string;
  }): Promise<FaceVerificationResult> {
    let reference = params.referenceEmbedding;

    // Native embeddings (or empty) won't match descriptor dims — rebuild from photo.
    if (!reference?.length || reference.length !== IMAGE_DESCRIPTOR_DIMS) {
      if (!params.referenceUri) {
        return {
          status: FaceVerificationStatuses.UNAVAILABLE,
          message:
            'No face enrollment photo on file. Ask an admin to enroll a face, then try again.',
        };
      }
      reference = await this.enrollFromImage(params.referenceUri);
    }

    if (!reference?.length) {
      return {
        status: FaceVerificationStatuses.UNAVAILABLE,
        message: 'Could not build a face template from the enrollment photo. Re-enroll the face.',
      };
    }

    let probe: number[] | null;
    try {
      probe = await extractImageDescriptor(params.captureUri);
    } catch (e) {
      return {
        status: FaceVerificationStatuses.REJECTED,
        message:
          e instanceof Error
            ? e.message
            : 'Could not read the capture for face matching.',
      };
    }

    if (!probe?.length || probe.length !== reference.length) {
      return {
        status: FaceVerificationStatuses.REJECTED,
        message: 'Capture descriptor could not be compared to enrollment. Retake the selfie.',
      };
    }

    const score = descriptorSimilarity(reference, probe);
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
