import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Speech from 'expo-speech';
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

const DELEGATE: 'cpu' | 'android-gpu' | 'nnapi' = 'cpu';
const delegates = DELEGATE === 'cpu' ? [] : [DELEGATE];
const TTS_COOLDOWN_MS = 4000; // intervalo mínimo entre falas

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
  const [speaking, setSpeaking] = useState(false);
  const lastUpdate = useRef(0);
  const lastSpoken = useRef('');
  const lastSpokenAt = useRef(0);

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

  // Para o TTS ao sair da tela
  useEffect(() => {
    return () => { Speech.stop(); };
  }, []);

  useEffect(() => {
    if (!hasPermission) requestPermission();
  }, [hasPermission, requestPermission]);

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

  if (!hasPermission) {
    return (
      <View style={styles.center}>
        <StatusBar style="light" />
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

  const nearest = labels[0];

  // TTS: fala o objeto mais próximo se score > 60% e cooldown expirou
  if (nearest && nearest.score >= 0.6) {
    const t = Date.now();
    const sameLabel = nearest.nome === lastSpoken.current;
    const cooldownOk = t - lastSpokenAt.current > TTS_COOLDOWN_MS;
    if (!sameLabel || cooldownOk) {
      lastSpoken.current = nearest.nome;
      lastSpokenAt.current = t;
      Speech.stop();
      Speech.speak(`${nearest.nome} à sua frente`, {
        language: 'pt-BR',
        rate: 1.1,
        onStart: () => setSpeaking(true),
        onDone: () => setSpeaking(false),
        onStopped: () => setSpeaking(false),
      });
    }
  }

  return (
    <View style={styles.flex}>
      <StatusBar style="light" />

      <Camera
        style={StyleSheet.absoluteFill}
        isActive={true}
        device={device}
        outputs={[frameOutput]}
      />

      {/* Top HUD */}
      <View style={styles.topHud}>
        <View style={styles.aiChip}>
          <View style={[styles.aiDot, detector.state === 'loaded' && styles.aiDotActive]} />
          <Ionicons name="hardware-chip-outline" size={14} color="#4ecdc4" />
          <Text style={styles.aiChipText}>
            {detector.state === 'loaded' ? 'IA Ativa' : 'Carregando...'}
          </Text>
          {detector.state === 'loaded' && (
            <Text style={styles.aiChipMs}>{ms.toFixed(0)}ms</Text>
          )}
        </View>

        {labels.length > 0 && (
          <View style={styles.countChip}>
            <Text style={styles.countChipText}>{labels.length} objeto{labels.length !== 1 ? 's' : ''}</Text>
          </View>
        )}
      </View>

      {/* Bottom overlay */}
      <View style={styles.bottomOverlay}>
        {detector.state === 'loaded' && labels.length === 0 && (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Nenhum objeto detectado</Text>
          </View>
        )}

        {labels.length > 1 && (
          <View style={styles.detectionList}>
            {labels.slice(1).map((l, i) => (
              <View key={i} style={styles.detectionItem}>
                <Text style={styles.detectionName}>{l.nome}</Text>
                <Text style={styles.detectionScore}>{Math.round(l.score * 100)}%</Text>
              </View>
            ))}
          </View>
        )}

        {nearest && (
          <View
            style={styles.alertBox}
            accessibilityLiveRegion="polite"
            accessibilityLabel={`Obstáculo mais próximo: ${nearest.nome}`}
          >
            <View style={styles.alertDot} />
            <Ionicons name="warning-outline" size={22} color="#ff4d4d" />
            <Text style={styles.alertLabel}>{nearest.nome} à sua frente</Text>
            {speaking
              ? <Ionicons name="volume-high-outline" size={20} color="#9d7ff4" accessibilityLabel="Falando" />
              : <Text style={styles.alertScore}>{Math.round(nearest.score * 100)}%</Text>
            }
          </View>
        )}

        {/* Stop button */}
        <View style={styles.stopBar}>
          <Pressable
            style={({ pressed }) => [styles.stopBtn, pressed && { opacity: 0.8 }]}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Parar navegação e voltar à tela principal"
          >
            <Ionicons name="close" size={24} color="#ff6b6b" />
            <Text style={styles.stopText}>Parar Navegação</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#020110' },
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
  topHud: {
    position: 'absolute', top: 52, left: 16, right: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
  },
  aiChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(2,1,16,0.85)',
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1.5, borderColor: 'rgba(78,205,196,0.35)',
  },
  aiDot: { width: 9, height: 9, borderRadius: 4.5, backgroundColor: 'rgba(78,205,196,0.3)' },
  aiDotActive: { backgroundColor: '#4ecdc4' },
  aiChipText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  aiChipMs: { color: '#7b70b0', fontSize: 12 },
  countChip: {
    backgroundColor: 'rgba(2,1,16,0.85)',
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)',
  },
  countChipText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  bottomOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, gap: 8 },
  alertBox: {
    marginHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(2,1,16,0.92)',
    borderRadius: 20, padding: 16,
    borderWidth: 2, borderColor: 'rgba(255,77,77,0.6)',
  },
  alertDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#ff4d4d', flexShrink: 0 },
  alertLabel: { color: '#ffffff', fontSize: 17, fontWeight: '800', flex: 1 },
  alertScore: { color: '#ff4d4d', fontSize: 14, fontWeight: '700' },
  detectionList: { marginHorizontal: 16, gap: 6 },
  detectionItem: {
    flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: 'rgba(2,1,16,0.7)',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  detectionName: { color: '#e0d8ff', fontSize: 15, fontWeight: '600' },
  detectionScore: { color: '#b8aee8', fontSize: 14 },
  emptyBox: {
    marginHorizontal: 16,
    backgroundColor: 'rgba(2,1,16,0.75)',
    borderRadius: 16, padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  emptyText: { color: colors.textMuted, fontSize: 15 },
  stopBar: {
    backgroundColor: '#020110',
    paddingHorizontal: 24, paddingTop: 14, paddingBottom: 36,
    borderTopWidth: 1.5, borderTopColor: 'rgba(255,255,255,0.07)',
  },
  stopBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
    minHeight: 64, borderRadius: 20,
    backgroundColor: 'rgba(240,82,82,0.12)',
    borderWidth: 2.5, borderColor: 'rgba(240,82,82,0.6)',
  },
  stopText: { color: '#ff6b6b', fontSize: 20, fontWeight: '800' },
});
