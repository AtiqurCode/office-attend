import { FaceVerificationStatuses } from '@/constants/status';
import { IMAGE_DESCRIPTOR_DIMS } from '@/services/face-verification/ImageDescriptor';
import type {
  FaceVerificationProvider,
  FaceVerificationResult,
} from '@/services/face-verification/types';

/**
 * Prefer native embeddings when available; otherwise image-descriptor match (Expo Go).
 */
export class CompositeFaceMatchProvider implements FaceVerificationProvider {
  readonly providerName = 'composite-face-match';

  constructor(
    private readonly primary: FaceVerificationProvider,
    private readonly fallback: FaceVerificationProvider
  ) {}

  async isAvailable(): Promise<boolean> {
    return (await this.primary.isAvailable()) || (await this.fallback.isAvailable());
  }

  async enrollFromImage(imageUri: string): Promise<number[] | null> {
    if (await this.primary.isAvailable()) {
      const primary = await this.primary.enrollFromImage?.(imageUri);
      if (primary?.length) return primary;
    }
    return (await this.fallback.enrollFromImage?.(imageUri)) ?? null;
  }

  async verifyAgainstEnrollment(params: {
    captureUri: string;
    referenceUri: string | null;
    referenceEmbedding: number[] | null;
    employeeId: string;
  }): Promise<FaceVerificationResult> {
    // Descriptor enrollments must stay on the descriptor matcher (dim mismatch vs native).
    if (params.referenceEmbedding?.length === IMAGE_DESCRIPTOR_DIMS) {
      return this.fallback.verifyAgainstEnrollment(params);
    }

    if (await this.primary.isAvailable()) {
      const result = await this.primary.verifyAgainstEnrollment(params);
      if (
        result.status === FaceVerificationStatuses.VERIFIED ||
        result.status === FaceVerificationStatuses.REJECTED
      ) {
        return result;
      }
      // UNAVAILABLE / pending → try fallback (e.g. photo-only enrollment)
    }
    return this.fallback.verifyAgainstEnrollment(params);
  }
}
