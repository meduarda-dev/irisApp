import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission, useFrameOutput } from 'react-native-vision-camera';
import { useResizer } from 'react-native-vision-camera-resizer';
import { useTensorflowModel } from 'react-native-fast-tflite';
import { scheduleOnRN } from 'react-native-worklets';
import { labelFor } from '../detection/labels';
import { type Sample } from '../detection/useBenchmark';
import { colors } from './theme/colors';

const MODEL_NAME = 'mobilenet_ssd';
const DELEGATE: 'cpu' | 'android-gpu' | 'nnapi' = 'cpu';
const delegates = DELEGATE === 'cpu' ? [] : [DELEGATE];

const now = () => {
  'worklet';
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
};

type Detection = { cls: number; score: number };

export default function CameraScreen() {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const [detections, setDetections] = useState<Detection[]>([]);
  const [ms, setMs] = useState(0);
  const lastUpdate = useRef(0);

  const detector = useTensorflowModel(
    require('../assets/models/mobilenet_ssd.tflite'),
    delegates
  );

  const { resizer } = useResizer({
    width: 300, height: 300,
    channelOrder: 'rgb', dataType: 'uint8',
    pixelLayout: 'interleaved', scaleMode: 'cover',
  });

  const onResult = useCallback((_sample: Sample, items: Detection[]) => {
    const t = Date.now();
    if (t - lastUpdate.current > 250) {
      lastUpdate.current = t;
      setMs(_sample.total);
      setDetections(items);
    }
  }, []);

  const frameOutput = useFrameOutput({
    pixelFormat: 'yuv',
    onFrame(frame) {
      'worklet';
      if (detector.state !== 'loaded' || resizer == null) { frame.dispose(); return; }

      const t0 = now();
      const resized = resizer.resize(frame);
      frame.dispose();
      const data = new Uint8Array(resized.getPixelBuffer());
      resized.dispose();
      const input = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
      const t1 = now();

      const outputs = detector.model.runSync([input]);
      const t2 = now();

      const classes = new Float32Array(outputs[1]!);
      const scores = new Float32Array(outputs[2]!);
      const count = new Float32Array(outputs[3]!)[0];
      const items: Detection[] = [];
      for (let i = 0; i < count; i++) {
        if (scores[i] > 0.5) items.push({ cls: classes[i], score: scores[i] });
      }

      scheduleOnRN(
        onResult,
        { pre: t1 - t0, infer: t2 - t1, total: t2 - t0, end: t2, nDet: items.length },
        items
      );
    },
  });

  useEffect(() => {
    if (!hasPermission) requestPermission();
  }, [hasPermission]);

  if (!hasPermission) {
    return (
      <View style={styles.center}>
        <StatusBar style="light" />
        {/* <Ionicons name="camera-off-outline" size={48} color={colors.accentSoft} /> */}
        <Text style={styles.permText}>Precisamos da câmera</Text>
        <Pressable style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Permitir acesso</Text>
        </Pressable>
      </View>
    );
  }

  if (device == null) {
    return (
      <View style={styles.center}>
        <Text style={styles.permText}>Câmera não encontrada</Text>
      </View>
    );
  }

  const labels = detections
    .map((d) => ({ nome: labelFor(d.cls), score: d.score }))
    .filter((d) => d.nome !== '???')
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  return (
    <View style={styles.flex}>
      <StatusBar style="light" />

      <Camera
        style={StyleSheet.absoluteFill}
        isActive={true}
        device={device}
        outputs={[frameOutput]}
      />

      {/* Botão voltar */}
      <Pressable style={styles.backBtn} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </Pressable>

      {/* HUD de detecções */}
      <View style={styles.hud}>
        <Text style={styles.hudMs}>
          {detector.state !== 'loaded' ? `carregando modelo...` : `${ms.toFixed(0)} ms`}
        </Text>
        {labels.length > 0
          ? labels.map((l, i) => (
              <Text key={i} style={styles.hudLabel}>
                {l.nome}
                <Text style={styles.hudScore}> {Math.round(l.score * 100)}%</Text>
              </Text>
            ))
          : detector.state === 'loaded' && (
              <Text style={styles.hudEmpty}>nenhum objeto detectado</Text>
            )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#000' },
  center: {
    flex: 1, backgroundColor: colors.bg,
    alignItems: 'center', justifyContent: 'center', gap: 16,
  },
  permText: { color: colors.text, fontSize: 16, fontWeight: '600' },
  permBtn: {
    backgroundColor: colors.primary, paddingHorizontal: 28,
    paddingVertical: 12, borderRadius: 12,
  },
  permBtnText: { color: colors.text, fontWeight: '600', fontSize: 15 },
  backBtn: {
    position: 'absolute', top: 52, left: 16,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20,
    padding: 8,
  },
  hud: {
    position: 'absolute', bottom: 40, left: 16, right: 16,
    backgroundColor: 'rgba(5,3,15,0.75)', borderRadius: 16,
    padding: 16, gap: 4,
    borderWidth: 1, borderColor: 'rgba(124,92,255,0.3)',
  },
  hudMs: { color: colors.accentSoft, fontSize: 11, marginBottom: 4 },
  hudLabel: { color: colors.text, fontSize: 18, fontWeight: '700' },
  hudScore: { color: colors.accentSoft, fontWeight: '400' },
  hudEmpty: { color: colors.textMuted, fontSize: 14 },
});
