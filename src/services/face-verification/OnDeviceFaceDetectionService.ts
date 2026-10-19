import { FaceDetectionStatuses } from '@/constants/status';
import type {
  FaceDetectionResult,
  FaceDetectionService,
} from '@/services/face-verification/types';

type DetectorFace = {
  bounds?: { origin?: { x: number; y: number }; size?: { width: number; height: number } };
  boundingBox?: { x: number; y: number; width: number; height: number };
  leftEyeOpenProbability?: number;
  rightEyeOpenProbability?: number;
  embedding?: number[];
};

type DetectorResult = {
  faces?: DetectorFace[];
  valid?: boolean;
  embedding?: number[];
};

type Detector = {
  detectFaces: (uri: string) => Promise<DetectorResult>;
  extractEmbedding?: (uri: string) => Promise<number[] | null>;
};

/**
 * Optional on-device face detection / embedding via native modules
 * (expo-vision-face-detector or expo-face-detection) in a development build.
 */
export class OnDeviceFaceDetectionService implements FaceDetectionService {
  readonly providerName = 'on-device-optional';

  private detector: Detector | null = null;
  private loadAttempted = false;

  async isAvailable(): Promise<boolean> {
    await this.ensureLoaded();
    return this.detector != null;
  }

  async detectInImage(imageUri: string): Promise<FaceDetectionResult> {
    await this.ensureLoaded();

    if (!this.detector) {
      return {
        status: FaceDetectionStatuses.UNAVAILABLE,
        faceCount: 0,
        message:
          'On-device face detection is unavailable. Use a development build with a face module, or verify with PIN.',
      };
    }

    try {
      const result = await this.detector.detectFaces(imageUri);
      const faces = result.faces ?? [];
      if (faces.length === 0) {
        return {
          status: FaceDetectionStatuses.NO_FACE,
          faceCount: 0,
          message: 'No face detected. Reposition and try again.',
        };
      }

      const face = faces[0];
      const bounds =
        face.boundingBox ??
        (face.bounds
          ? {
              x: face.bounds.origin?.x ?? 0,
              y: face.bounds.origin?.y ?? 0,
              width: face.bounds.size?.width ?? 0,
              height: face.bounds.size?.height ?? 0,
            }
          : undefined);

      const embedding = face.embedding ?? result.embedding;
      return {
        status: FaceDetectionStatuses.FACE_DETECTED,
        faceCount: faces.length,
        bounds,
        embedding,
        leftEyeOpenProbability: face.leftEyeOpenProbability,
        rightEyeOpenProbability: face.rightEyeOpenProbability,
        message: 'Face detected.',
      };
    } catch {
      return {
        status: FaceDetectionStatuses.UNAVAILABLE,
        faceCount: 0,
        message: 'Face detection failed on this device.',
      };
    }
  }

  async extractEmbedding(imageUri: string): Promise<number[] | null> {
    await this.ensureLoaded();
    if (!this.detector) return null;
    if (this.detector.extractEmbedding) {
      return this.detector.extractEmbedding(imageUri);
    }
    const detection = await this.detectInImage(imageUri);
    return detection.embedding ?? null;
  }

  private async ensureLoaded(): Promise<void> {
    if (this.loadAttempted) return;
    this.loadAttempted = true;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const vision = require('expo-vision-face-detector') as {
        detectFaces?: (uri: string) => Promise<DetectorResult>;
        default?: Detector;
      };
      if (typeof vision.detectFaces === 'function') {
        this.detector = { detectFaces: vision.detectFaces };
        return;
      }
      if (vision.default?.detectFaces) {
        this.detector = vision.default;
        return;
      }
    } catch {
      // continue
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const expoFace = require('expo-face-detection') as {
        detectFaces?: (uri: string) => Promise<DetectorResult>;
        extractEmbedding?: (uri: string) => Promise<number[] | null>;
        getFaceEmbedding?: (uri: string) => Promise<number[] | null>;
      };
      if (typeof expoFace.detectFaces === 'function') {
        this.detector = {
          detectFaces: expoFace.detectFaces,
          extractEmbedding:
            expoFace.extractEmbedding ?? expoFace.getFaceEmbedding ?? undefined,
        };
      }
    } catch {
      this.detector = null;
    }
  }
}
