import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';

import { FaceGuide } from '@/components/FaceGuide';
import { Button } from '@/components/ui/Button';
import { FaceDetectionStatuses, FaceEnrollmentStatuses } from '@/constants/status';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useServices } from '@/hooks/useServices';
import { useAppStore } from '@/store/appStore';

function paramId(raw: string | string[] | undefined): string | undefined {
  if (Array.isArray(raw)) return raw[0];
  return raw || undefined;
}

export default function AdminFaceEnrollScreen() {
  const theme = useAppTheme();
  const services = useServices();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = useMemo(() => paramId(params.id), [params.id]);
  const company = useAppStore((s) => s.company);
  const setEmployees = useAppStore((s) => s.setEmployees);
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [savedPath, setSavedPath] = useState<string | null>(null);

  if (!id) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.danger }}>Missing employee id.</Text>
        <Button title="Back" onPress={() => router.back()} />
      </View>
    );
  }

  if (!permission) {
    return <View style={[styles.center, { backgroundColor: theme.background }]} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.text, textAlign: 'center' }}>
          Camera is used to save one photo. Nothing is face-matched.
        </Text>
        <Button title="Allow camera" onPress={requestPermission} />
      </View>
    );
  }

  const enroll = async () => {
    if (!cameraRef.current) return;
    setBusy(true);
    setMessage(null);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        skipProcessing: false,
      });
      if (!photo?.uri) {
        setMessage('Capture failed — try again.');
        return;
      }
      setPreviewUri(photo.uri);

      // Detect if the module is available; only hard-fail on explicit NO_FACE.
      const detection = await services.faceDetection.detectInImage(photo.uri);
      if (detection.status === FaceDetectionStatuses.NO_FACE) {
        setMessage(detection.message);
        return;
      }

      let embedding: number[] | null = null;
      try {
        embedding = (await services.faceVerification.enrollFromImage?.(photo.uri)) ?? null;
        if (!embedding?.length && detection.embedding?.length) {
          embedding = detection.embedding;
        }
      } catch {
        embedding = null;
      }

      const path = await services.images.savePrivateImage(photo.uri, 'reference');
      await services.employees.setFaceEnrollment(
        id,
        FaceEnrollmentStatuses.ENROLLED,
        path,
        embedding && embedding.length > 0 ? embedding : null
      );
      // Same capture becomes the list/kiosk profile picture.
      await services.employees.setProfileImage(id, path);

      setSavedPath(path);

      setMessage('Photo saved as their picture. It is kept as evidence, not a face match.');

      if (company) {
        setEmployees(await services.employees.listByCompany(company.id));
      }

      Alert.alert('Photo saved', 'Their picture is updated. It is evidence, not a face match.');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Enrollment failed';
      setMessage(msg);
      Alert.alert('Enrollment failed', msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={{ color: theme.textSecondary, fontSize: 13, lineHeight: 18 }}>
        Center their face. This photo is evidence and their list picture. It is not matched.
      </Text>

      {previewUri && savedPath ? (
        <Image source={{ uri: previewUri }} style={styles.camera} />
      ) : (
        <View style={styles.cameraWrap}>
          <CameraView ref={cameraRef} style={styles.camera} facing="front" />
          <FaceGuide />
        </View>
      )}

      {message ? <Text style={{ color: theme.text }}>{message}</Text> : null}
      {savedPath ? (
          <Text style={{ color: theme.textSecondary, fontSize: 12 }}>Saved as their picture.</Text>
      ) : null}

      {savedPath ? (
        <>
          <Button title="Retake" variant="secondary" onPress={() => {
            setSavedPath(null);
            setPreviewUri(null);
            setMessage(null);
          }} />
          <Button title="Done" onPress={() => router.back()} />
        </>
      ) : (
        <Button title="Save photo" loading={busy} onPress={enroll} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  center: { flex: 1, padding: 20, justifyContent: 'center', gap: 12 },
  cameraWrap: { flex: 1, borderRadius: 16, overflow: 'hidden', minHeight: 180 },
  camera: { flex: 1, borderRadius: 16, minHeight: 180 },
});
