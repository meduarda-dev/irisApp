import React, { useEffect, useState } from "react";
import { Button, StyleSheet, Text, View } from "react-native";
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useFrameOutput,
} from "react-native-vision-camera";
import { useResizer } from "react-native-vision-camera-resizer";
import { useTensorflowModel } from "react-native-fast-tflite";
import { scheduleOnRN } from "react-native-worklets";
import { labelFor } from "../detection/labels";

type Detection = { cls: number; score: number };
type Result = { ms: number; items: Detection[] };

export default function Index() {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice("back");
  const [result, setResult] = useState<Result>({ ms: 0, items: [] });

  const detector = useTensorflowModel(
    require("../assets/models/mobilenet_ssd.tflite"),
    [],
  );

  const { resizer } = useResizer({
    width: 300,
    height: 300,
    channelOrder: "rgb",
    dataType: "uint8",
    pixelLayout: "interleaved",
    scaleMode: "stretch",
  });

  const frameOutput = useFrameOutput({
    pixelFormat: "yuv",
    onFrame(frame) {
      "worklet";
      if (detector.state !== "loaded" || resizer == null) {
        frame.dispose();
        return;
      }

      const start = Date.now();
      const resized = resizer.resize(frame);
      frame.dispose();
      const data = new Uint8Array(resized.getPixelBuffer());
      resized.dispose();
      const input = data.buffer.slice(
        data.byteOffset,
        data.byteOffset + data.byteLength,
      );

      const outputs = detector.model.runSync([input]);
      const ms = Date.now() - start;

      const classes = new Float32Array(outputs[1]!);
      const scores = new Float32Array(outputs[2]!);
      const count = new Float32Array(outputs[3]!)[0];

      const items: Detection[] = [];
      for (let i = 0; i < count; i++) {
        if (scores[i] > 0.5) items.push({ cls: classes[i], score: scores[i] });
      }

      scheduleOnRN(setResult, { ms, items });
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

  const linhas = result.items
    .map((d) => ({ nome: labelFor(d.cls), score: d.score }))
    .filter((d) => d.nome !== "???")
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return (
    <View style={styles.flex}>
      <Camera
        style={StyleSheet.absoluteFill}
        isActive={true}
        device={device}
        outputs={[frameOutput]}
      />
      <Text style={styles.hud}>
        {detector.state !== "loaded"
          ? `modelo: ${detector.state}`
          : `${result.ms} ms\n` +
            (linhas.length
              ? linhas
                  .map((l) => `${l.nome} ${Math.round(l.score * 100)}%`)
                  .join("\n")
              : "nada detectado")}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  hud: {
    position: "absolute",
    top: 60,
    left: 16,
    right: 16,
    color: "white",
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 8,
  },
});
