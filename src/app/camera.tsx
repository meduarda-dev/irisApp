import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as Speech from 'expo-speech';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission, useFrameOutput } from 'react-native-vision-camera';
import { useResizer } from 'react-native-vision-camera-resizer';
import { useTensorflowModel } from 'react-native-fast-tflite';
import { scheduleOnRN } from 'react-native-worklets';
import { labelFor } from '../detection/labels';
import { type Sample } from '../detection/useBenchmark';
import { useAppTheme, speechRates } from '../context/ThemeContext';
import { useTcc } from '../context/TccContext';
import { type SessionConfig } from '../detection/useTccSession';
import { colors } from './theme/colors';

const DELEGATE: 'cpu' | 'android-gpu' | 'nnapi' = 'cpu';
const delegates = DELEGATE === 'cpu' ? [] : [DELEGATE];
const TTS_COOLDOWN_MS = 4000; // intervalo mínimo entre falas

const now = () => {
  'worklet';
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
};

type Detection = { cls: number; score: number; box: [number, number, number, number] };

export default function CameraScreen() {
  const { speechRateKey } = useAppTheme();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const [detections, setDetections] = useState<Detection[]>([]);
  const [ms, setMs] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const lastUpdate = useRef(0);
  const lastSpoken = useRef('');
  const lastSpokenAt = useRef(0);

  // modo de medição TCC
  const params = useLocalSearchParams<{ tccConfig?: string }>();
  const tccConfig = useRef<SessionConfig | null>(
    params.tccConfig ? JSON.parse(params.tccConfig) : null
  );
  const tcc = useTcc();
  const tccActive = tccConfig.current !== null;

  const detector = useTensorflowModel(
    require('../assets/models/mobilenet_ssd.tflite'),
    delegates
  );

  const { resizer } = useResizer({
    width: 300, height: 300,
    channelOrder: 'rgb', dataType: 'uint8',
    pixelLayout: 'interleaved', scaleMode: 'cover',
  });

  const onResult = useCallback((_sample: Sample, items: Detection[], tPosMs: number, tsMs: number) => {
    const t = Date.now();
    if (t - lastUpdate.current > 250) {
      lastUpdate.current = t;
      setMs(_sample.total);
      setDetections(items);
    }
    if (tccActive) {
      tcc.addFrame(0, _sample.pre, _sample.infer, tPosMs, items.length, tsMs);
    }
  }, [tccActive]); // eslint-disable-line react-hooks/exhaustive-deps

  // iniciar sessão TCC assim que a câmera montar
  useEffect(() => {
    if (tccActive && tcc.phase === 'idle') {
      tcc.start(tccConfig.current!, () => {
        // ao terminar, volta para benchmark com o resumo
        router.replace({
          pathname: '/benchmark',
          params: { summary: JSON.stringify(tcc.summary) },
        });
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

      const boxes   = new Float32Array(outputs[0]!);
      const classes = new Float32Array(outputs[1]!);
      const scores  = new Float32Array(outputs[2]!);
      const count   = new Float32Array(outputs[3]!)[0];
      const items: Detection[] = [];
      for (let i = 0; i < count; i++) {
        if (scores[i] > 0.5) items.push({
          cls: classes[i],
          score: scores[i],
          box: [boxes[i * 4], boxes[i * 4 + 1], boxes[i * 4 + 2], boxes[i * 4 + 3]],
        });
      }

      const t3 = now();
      scheduleOnRN(
        onResult,
        { pre: t1 - t0, infer: t2 - t1, total: t2 - t0, end: t2, nDet: items.length },
        items,
        t3 - t2,  // t_posprocessamento
        t3,       // timestamp
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
    .map((d) => ({ nome: labelFor(d.cls), score: d.score, box: d.box }))
    .filter((d) => d.nome !== '???' )
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
      const textoNarrado = `${nearest.nome} à sua frente`;
      const detectedAt = t;

      // registrar evento TCC
      if (tccActive) {
        const cfg = tccConfig.current!;
        const [ymin, xmin, ymax, xmax] = nearest.box;
        tcc.addDetectionEvent({
          timestamp_ms: t,
          classe_detectada: nearest.nome,
          confianca: nearest.score,
          bbox_x: xmin,
          bbox_y: ymin,
          bbox_largura: xmax - xmin,
          bbox_altura: ymax - ymin,
          isolado: labels.length === 1 ? 'sim' : 'nao',
          detectou_esperado: cfg.objetoEsperado === ''
            ? 'nao_aplicavel'
            : nearest.nome === cfg.objetoEsperado ? 'sim' : 'nao',
          texto_narrado: textoNarrado,
          detectedAt,
          tempo_deteccao_ate_fala_ms: '',
          fala_iniciou: 'nao',
        });
      }

      Speech.stop();
      Speech.speak(textoNarrado, {
        language: 'pt-BR',
        rate: speechRates[speechRateKey],
        onStart: () => {
          setSpeaking(true);
          if (tccActive) tcc.markSpeechStarted(nearest.nome, Date.now());
        },
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

      {/* Bounding boxes */}
      {labels.map((l, i) => {
        const [ymin, xmin, ymax, xmax] = l.box;
        const isNearest = i === 0;
        const color = isNearest ? '#ff4d4d' : '#9d7ff4';
        return (
          <View
            key={i}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left:   xmin * screenW,
              top:    ymin * screenH,
              width:  (xmax - xmin) * screenW,
              height: (ymax - ymin) * screenH,
              borderWidth: isNearest ? 2.5 : 1.5,
              borderColor: color,
              borderRadius: 6,
            }}
          >
            <View style={[styles.boxLabel, { backgroundColor: color }]}>
              <Text style={styles.boxLabelText} numberOfLines={1}>
                {l.nome} {Math.round(l.score * 100)}%
              </Text>
            </View>
          </View>
        );
      })}

      {/* HUD modo de medição */}
      {tccActive && (
        <View style={styles.tccHud}>
          <View style={[styles.tccBadge, {
            backgroundColor: tcc.phase === 'warmup' ? 'rgba(255,180,0,0.9)' :
              tcc.phase === 'recording' ? 'rgba(255,77,77,0.9)' : 'rgba(78,205,196,0.9)',
          }]}>
            <Ionicons
              name={tcc.phase === 'warmup' ? 'timer-outline' :
                tcc.phase === 'recording' ? 'radio-button-on' : 'checkmark-circle'}
              size={14} color="#fff"
            />
            <Text style={styles.tccBadgeText}>
              {tcc.phase === 'warmup' ? `Aquecimento ${tcc.countdown}s` :
                tcc.phase === 'recording' ? `REC ${tcc.countdown}s` : 'Concluído'}
            </Text>
          </View>
        </View>
      )}

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
    flex: 1, backgroundColor: '#05030F',
    alignItems: 'center', justifyContent: 'center', gap: 16,
  },
  permText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  permBtn: {
    backgroundColor: '#7C5CE8', paddingHorizontal: 28,
    paddingVertical: 12, borderRadius: 12,
  },
  permBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 15 },
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
  tccHud: {
    position: 'absolute', top: 52, alignSelf: 'center', zIndex: 10,
  },
  tccBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
  },
  tccBadgeText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  boxLabel: {
    position: 'absolute', top: 0, left: 0,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
  },
  boxLabelText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});
