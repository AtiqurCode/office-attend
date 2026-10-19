import {
  descriptorSimilarity,
  EYE_FRAME_DIFFERENCE_MIN,
  extractImageDescriptor,
} from '@/services/face-verification/ImageDescriptor';
import type {
  EyeLivenessProvider,
  EyeLivenessResult,
  FaceDetectionResult,
} from '@/services/face-verification/types';

/**
 * Blink / eyes-open liveness assist — NOT medical iris recognition.
 */
export class BlinkEyeLivenessProvider implements EyeLivenessProvider {
  readonly providerName = 'blink-eye-liveness';

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async evaluate(
    samples: FaceDetectionResult[],
    imageUris?: string[]
  ): Promise<EyeLivenessResult> {
    if (samples.length === 0 && (!imageUris || imageUris.length === 0)) {
      return {
        ok: false,
        blinked: false,
        eyesOpen: false,
        message: 'No face samples for eye liveness check.',
      };
    }

    const withEyeData = samples.filter(
      (s) =>
        typeof s.leftEyeOpenProbability === 'number' ||
        typeof s.rightEyeOpenProbability === 'number'
    );

    if (withEyeData.length > 0) {
      const openScores = withEyeData.map((s) => {
        const l = s.leftEyeOpenProbability ?? 0.5;
        const r = s.rightEyeOpenProbability ?? 0.5;
        return (l + r) / 2;
      });

      const sawClosed = openScores.some((v) => v < 0.35);
      const sawOpen = openScores.some((v) => v > 0.65);
      const blinked = sawClosed && sawOpen;
      const eyesOpen = openScores[openScores.length - 1] > 0.55;

      if (blinked || (eyesOpen && withEyeData.length >= 2)) {
        return {
          ok: true,
          blinked,
          eyesOpen,
          message: blinked
            ? 'Blink detected. Eye liveness assist passed (not iris biometrics).'
            : 'Eyes open across samples. Eye liveness assist passed (not iris biometrics).',
        };
      }

      return {
        ok: false,
        blinked,
        eyesOpen,
        message: 'Eye liveness failed. Blink once, then look at the camera with both eyes open.',
      };
    }

    // No landmark probabilities (typical Expo Go) — require motion between frames.
    if (imageUris && imageUris.length >= 2) {
      try {
        const a = await extractImageDescriptor(imageUris[0]);
        const b = await extractImageDescriptor(imageUris[imageUris.length - 1]);
        const similarity = descriptorSimilarity(a, b);
        const diff = 1 - similarity;
        if (diff >= EYE_FRAME_DIFFERENCE_MIN) {
          return {
            ok: true,
            blinked: true,
            eyesOpen: true,
            message: `Eye challenge passed via frame change (Δ=${diff.toFixed(3)}; not iris biometrics).`,
          };
        }
        return {
          ok: false,
          blinked: false,
          eyesOpen: false,
          message:
            'Eye challenge failed — captures looked too similar. Blink clearly, then capture again with eyes open.',
        };
      } catch (e) {
        return {
          ok: false,
          blinked: false,
          eyesOpen: false,
          message:
            e instanceof Error
              ? e.message
              : 'Eye challenge could not compare captures.',
        };
      }
    }

    const anyFace = samples.some((s) => s.status === 'face_detected');
    return {
      ok: false,
      blinked: false,
      eyesOpen: anyFace,
      message: anyFace
        ? 'Eye landmarks unavailable. Capture two samples (blink, then eyes open).'
        : 'Eye liveness failed — no face landmarks and not enough challenge frames.',
    };
  }
}
