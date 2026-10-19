import { FaceVerificationStatuses } from '@/constants/status';
import { CompositeFaceMatchProvider } from '@/services/face-verification/CompositeFaceMatchProvider';
import { IMAGE_DESCRIPTOR_DIMS } from '@/services/face-verification/ImageDescriptor';
import { OnDeviceFaceMatchProvider } from '@/services/face-verification/OnDeviceFaceMatchProvider';
import type {
  FaceDetectionResult,
  FaceDetectionService,
  FaceVerificationProvider,
} from '@/services/face-verification/types';
import { cosineSimilarity } from '@/services/face-verification/types';

class FakeDetection implements FaceDetectionService {
  readonly providerName = 'fake';
  constructor(private readonly embedding: number[] | null) {}
  async isAvailable() {
    return this.embedding != null;
  }
  async detectInImage(): Promise<FaceDetectionResult> {
    return {
      status: 'face_detected',
      faceCount: 1,
      embedding: this.embedding ?? undefined,
      message: 'ok',
    };
  }
  async extractEmbedding() {
    return this.embedding;
  }
}

describe('OnDeviceFaceMatchProvider', () => {
  it('never fabricates verified when unavailable', async () => {
    const provider = new OnDeviceFaceMatchProvider(new FakeDetection(null));
    const result = await provider.verifyAgainstEnrollment({
      captureUri: 'file://a.jpg',
      referenceUri: null,
      referenceEmbedding: [0.1, 0.2],
      employeeId: 'e1',
    });
    expect(result.status).toBe(FaceVerificationStatuses.UNAVAILABLE);
    expect(result.score).toBeUndefined();
  });

  it('verifies when cosine similarity is high', async () => {
    const emb = [1, 0, 0];
    const provider = new OnDeviceFaceMatchProvider(new FakeDetection(emb), 0.7);
    const result = await provider.verifyAgainstEnrollment({
      captureUri: 'file://a.jpg',
      referenceUri: null,
      referenceEmbedding: emb,
      employeeId: 'e1',
    });
    expect(result.status).toBe(FaceVerificationStatuses.VERIFIED);
    expect(result.score).toBeGreaterThan(0.99);
  });

  it('rejects dissimilar embeddings', async () => {
    const provider = new OnDeviceFaceMatchProvider(new FakeDetection([0, 1, 0]), 0.9);
    const result = await provider.verifyAgainstEnrollment({
      captureUri: 'file://a.jpg',
      referenceUri: null,
      referenceEmbedding: [1, 0, 0],
      employeeId: 'e1',
    });
    expect(result.status).toBe(FaceVerificationStatuses.REJECTED);
  });
});

describe('cosineSimilarity', () => {
  it('returns 1 for identical vectors', () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1);
  });
});

describe('CompositeFaceMatchProvider routing', () => {
  it('routes descriptor-length embeddings to fallback', async () => {
    const primary: FaceVerificationProvider = {
      providerName: 'primary',
      isAvailable: async () => true,
      verifyAgainstEnrollment: jest.fn(async () => ({
        status: FaceVerificationStatuses.VERIFIED,
        message: 'native',
        score: 1,
      })),
    };
    const fallback: FaceVerificationProvider = {
      providerName: 'fallback',
      isAvailable: async () => true,
      verifyAgainstEnrollment: jest.fn(async () => ({
        status: FaceVerificationStatuses.VERIFIED,
        message: 'descriptor',
        score: 0.9,
      })),
    };

    const composite = new CompositeFaceMatchProvider(primary, fallback);
    const emb = new Array(IMAGE_DESCRIPTOR_DIMS).fill(0);
    emb[0] = 1;
    const result = await composite.verifyAgainstEnrollment({
      captureUri: 'file://a.jpg',
      referenceUri: 'file://r.jpg',
      referenceEmbedding: emb,
      employeeId: 'e1',
    });
    expect(fallback.verifyAgainstEnrollment).toHaveBeenCalled();
    expect(primary.verifyAgainstEnrollment).not.toHaveBeenCalled();
    expect(result.message).toBe('descriptor');
  });
});
