import { FaceVerificationStatuses } from '@/constants/status';
import type {
  FaceVerificationProvider,
  FaceVerificationResult,
} from '@/services/face-verification/types';

/**
 * Legacy fallback when no on-device matcher is wired.
 */
export class PendingServerFaceVerificationProvider implements FaceVerificationProvider {
  readonly providerName = 'pending-server';

  async isAvailable(): Promise<boolean> {
    return false;
  }

  async verifyAgainstEnrollment(_params: {
    captureUri: string;
    referenceUri: string | null;
    referenceEmbedding: number[] | null;
    employeeId: string;
  }): Promise<FaceVerificationResult> {
    return {
      status: FaceVerificationStatuses.UNAVAILABLE,
      message:
        'Face verification unavailable in this build. Identity matching needs an on-device face module or a future server service.',
    };
  }
}
