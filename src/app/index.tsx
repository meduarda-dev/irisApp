import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useFrameOutput,
} from 'react-native-vision-camera';
import { useResizer } from 'react-native-vision-camera-resizer';
import { useTensorflowModel } from 'react-native-fast-tflite';
import { scheduleOnRN } from 'react-native-worklets';
import { labelFor } from '../detection/labels';
import { useBenchmark, type Sample } from '../detection/useBenchmark';

// >>> Mude estas duas constantes a cada configuração testada.
// (Se trocar de modelo, troque também o require() lá embaixo.)
const MODEL_NAME = 'mobilenet_ssd';
const DELEGATE: 'cpu' | 'android-gpu' | 'nnapi' = 'cpu';
const delegates = DELEGATE === 'cpu' ? [] : [DELEGATE];

const now = () => {
  'worklet';
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
};

type Detection = { cls: number; score: number };

export default function Index() {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const bench = useBenchmark(MODEL_NAME, DELEGATE);
  const [hud, setHud] = useState<{ ms: number; items: Detection[] }>({ ms: 0, items: [] });
  const [cond, setCond] = useState('');
  const lastHud = useRef(0);

  const detector = useTensorflowModel(
    require('../assets/models/mobilenet_ssd.tflite'),
    delegates
  );

  const { resizer } = useResizer({
    width: 300,
    height: 300,
    channelOrder: 'rgb',
    dataType: 'uint8',
    pixelLayout: 'interleaved',
    scaleMode: 'cover',
  });

  const { onSample } = bench;
  const onResult = useCallback(
    (sample: Sample, items: Detection[]) => {
      onSample(sample);
      const t = Date.now();
      if (t - lastHud.current > 250) {
        lastHud.current = t;
        setHud({ ms: sample.total, items });
      }
    },
    [onSample]
  );

  const frameOutput = useFrameOutput({
    pixelFormat: 'yuv',
    onFrame(frame) {
      'worklet';
      if (detector.state !== 'loaded' || resizer == null) {
        frame.dispose();
        return;
      }

      const t0 = now();
      const resized = resizer.resize(frame);
      frame.dispose();
      const data = new Uint8Array(resized.getPixelBuffer());
      resized.dispose();
      const input = data.buffer.slice(
        data.byteOffset,
        data.byteOffset + data.byteLength
      );
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
        <Text>Precisamos da câmera</Text>
        <Button title="Permitir" onPress={requestPermission} />
      </View>
    );
  }
  if (device == null) return <Text>Câmera não encontrada</Text>;

  const linhas = hud.items
    .map((d) => ({ nome: labelFor(d.cls), score: d.score }))
    .filter((d) => d.nome !== '???')
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  const s = bench.summary;
  const status =
    bench.phase === 'warmup' ? 'aquecendo (5 s)...'
    : bench.phase === 'recording' ? 'gravando (60 s)...'
    : bench.phase === 'done' && s
      ? `${s.frames} frames | ${s.fps.toFixed(1)} FPS\n` +
        `total ${s.total.mean.toFixed(1)} ms (mediana ${s.total.median.toFixed(1)}, p95 ${s.total.p95.toFixed(1)})\n` +
        `inferência ${s.infer.mean.toFixed(1)} ms | pré ${s.pre.mean.toFixed(1)} ms`
    : bench.phase === 'done' ? 'poucos frames, repita'
    : 'pronto';

  const compartilhar = (csv: string, logar: boolean) => {
    if (!csv) return;
    if (logar) console.log(csv);
    Share.share({ message: csv });
  };

  return (
    <View style={styles.flex}>
      <Camera
        style={StyleSheet.absoluteFill}
        isActive={true}
        device={device}
        outputs={[frameOutput]}
      />

      <Text style={styles.hud}>
        {detector.state !== 'loaded'
          ? `modelo: ${detector.state}`
          : `${MODEL_NAME} | ${DELEGATE} | ${hud.ms.toFixed(1)} ms\n` +
            (linhas.length
              ? linhas.map((l) => `${l.nome} ${Math.round(l.score * 100)}%`).join('\n')
              : 'nada detectado')}
      </Text>

      <View style={styles.panel}>
        <Text style={styles.status}>{status}</Text>
        <TextInput
          style={styles.input}
          placeholder="condição (ex: luz forte, 1 m)"
          value={cond}
          onChangeText={setCond}
        />
        <Button
          title="Medir (5 s aquecimento + 60 s)"
          onPress={bench.start}
          disabled={bench.phase === 'warmup' || bench.phase === 'recording'}
        />
        <Button
          title="Compartilhar resumo (CSV)"
          onPress={() => compartilhar(bench.summaryCsv(cond), true)}
          disabled={bench.phase !== 'done'}
        />
        <Button
          title="Compartilhar frames (CSV)"
          onPress={() => compartilhar(bench.rawCsv(cond), false)}
          disabled={bench.phase !== 'done'}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  hud: {
    position: 'absolute', top: 60, left: 16, right: 16,
    color: 'white', backgroundColor: 'rgba(0,0,0,0.6)', padding: 8,
  },
  panel: {
    position: 'absolute', bottom: 30, left: 16, right: 16,
    backgroundColor: 'rgba(0,0,0,0.6)', padding: 8, gap: 6,
  },
  status: { color: 'white' },
  input: { backgroundColor: 'white', padding: 6 },
});