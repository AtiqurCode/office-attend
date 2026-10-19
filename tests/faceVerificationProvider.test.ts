import { FaceVerificationStatuses } from '@/constants/status';
import { PendingServerFaceVerificationProvider } from '@/services/face-verification/PendingServerFaceVerificationProvider';

describe('PendingServerFaceVerificationProvider', () => {
  it('never fabricates a verified match', async () => {
    const provider = new PendingServerFaceVerificationProvider();
    expect(await provider.isAvailable()).toBe(false);
    const result = await provider.verifyAgainstEnrollment({
      captureUri: 'file://capture.jpg',
      referenceUri: 'file://ref.jpg',
      referenceEmbedding: null,
      employeeId: 'emp-1',
    });
    expect(result.status).toBe(FaceVerificationStatuses.UNAVAILABLE);
    expect(result.score).toBeUndefined();
  });
});
