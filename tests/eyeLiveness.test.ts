import { BlinkEyeLivenessProvider } from '@/services/face-verification/EyeLivenessProvider';
import type { FaceDetectionResult } from '@/services/face-verification/types';

function sample(partial: Partial<FaceDetectionResult>): FaceDetectionResult {
  return {
    status: 'face_detected',
    faceCount: 1,
    message: 'ok',
    ...partial,
  };
}

describe('BlinkEyeLivenessProvider', () => {
  const provider = new BlinkEyeLivenessProvider();

  it('passes when blink (closed then open) is observed', async () => {
    const result = await provider.evaluate([
      sample({ leftEyeOpenProbability: 0.1, rightEyeOpenProbability: 0.1 }),
      sample({ leftEyeOpenProbability: 0.9, rightEyeOpenProbability: 0.85 }),
    ]);
    expect(result.ok).toBe(true);
    expect(result.blinked).toBe(true);
  });

  it('fails with empty samples', async () => {
    const result = await provider.evaluate([]);
    expect(result.ok).toBe(false);
  });

  it('fails when landmarks missing and fewer than 2 frames', async () => {
    const result = await provider.evaluate([
      sample({ status: 'unavailable', faceCount: 0 }),
    ]);
    expect(result.ok).toBe(false);
  });
});
