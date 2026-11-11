import * as Device from 'expo-device';
import * as FileSystem from 'expo-file-system/legacy';
import { useCallback, useRef, useState } from 'react';
import * as Sharing from 'expo-sharing';
import { summarize } from '../utils/stats';

// ─── tipos públicos ────────────────────────────────────────────────────────────

export type TccPhase = 'idle' | 'warmup' | 'recording' | 'done';

export type SessionConfig = {
  idCasoTeste: string;
  objetosEsperados: string[];   // múltiplos objetos possíveis
  observacao: string;
};

export type DetectionEvent = {
  timestamp_ms: number;
  classe_detectada: string;
  confianca: number;
  bbox_x: number;
  bbox_y: number;
  bbox_largura: number;
  bbox_altura: number;
  isolado: 'sim' | 'nao';
  detectou_esperado: 'sim' | 'nao' | 'nao_aplicavel';
  texto_narrado: string;
  detectedAt: number;
  tempo_deteccao_ate_fala_ms: number;
  fala_iniciou: 'sim' | 'nao';
};

export type FrameRow = {
  timestamp_ms: number;
  indice_quadro: number;
  t_captura_ms: number;
  t_preprocessamento_ms: number;
  t_inferencia_ms: number;
  t_posprocessamento_ms: number;
  t_total_ms: number;
  fps_instantaneo: number;
  num_deteccoes_acima_do_limiar: number;
};

export type ObjetoDetectado = {
  classe: string;
  ocorrencias: number;
  confianca_media: number;
  confianca_max: number;
};

export type SessionSummary = {
  totalFrames: number;
  totalEventos: number;
  taxaDetectouEsperado: string;
  objetosDetectados: ObjetoDetectado[];
  fps: { mean: number; median: number; p95: number; std: number };
  pre: { mean: number; median: number; p95: number; std: number };
  infer: { mean: number; median: number; p95: number; std: number };
  total: { mean: number; median: number; p95: number; std: number };
};

// ─── constantes ───────────────────────────────────────────────────────────────

const WARMUP_MS = 5_000;
const RECORD_MS = 30_000;
const f = (n: number) => parseFloat(n.toFixed(3));

// ─── hook ─────────────────────────────────────────────────────────────────────

export function useTccSession() {
  const [phase, setPhaseState] = useState<TccPhase>('idle');
  const [countdown, setCountdown] = useState(0);
  const [summary, setSummary] = useState<SessionSummary | null>(null);

  const phaseRef = useRef<TccPhase>('idle');
  const configRef = useRef<SessionConfig | null>(null);
  const sessionId = useRef('');
  const frameRows = useRef<FrameRow[]>([]);
  const detectionEvents = useRef<DetectionEvent[]>([]);
  const frameIndex = useRef(0);
  const lastFrameTs = useRef(0);
  const warmupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const onDoneRef = useRef<(() => void) | null>(null);
  const summaryRef = useRef<SessionSummary | null>(null);

  const setPhase = useCallback((p: TccPhase) => {
    phaseRef.current = p;
    setPhaseState(p);
  }, []);

  // ── iniciar sessão ──────────────────────────────────────────────────────────
  const start = useCallback((cfg: SessionConfig, onDone?: () => void) => {
    if (phaseRef.current !== 'idle' && phaseRef.current !== 'done') return;

    configRef.current = cfg;
    sessionId.current = String(Date.now());
    frameRows.current = [];
    detectionEvents.current = [];
    frameIndex.current = 0;
    lastFrameTs.current = 0;
    setSummary(null);
    summaryRef.current = null;
    onDoneRef.current = onDone ?? null;

    setPhase('warmup');
    let remaining = Math.ceil(WARMUP_MS / 1000);
    setCountdown(remaining);
    countdownTimer.current = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(countdownTimer.current!);
        countdownTimer.current = null;
      }
    }, 1000);

    warmupTimer.current = setTimeout(() => {
      frameRows.current = [];
      detectionEvents.current = [];
      frameIndex.current = 0;
      lastFrameTs.current = 0;
      setPhase('recording');

      let recRemaining = Math.ceil(RECORD_MS / 1000);
      setCountdown(recRemaining);
      countdownTimer.current = setInterval(() => {
        recRemaining -= 1;
        setCountdown(recRemaining);
        if (recRemaining <= 0) {
          clearInterval(countdownTimer.current!);
          countdownTimer.current = null;
        }
      }, 1000);

      recordTimer.current = setTimeout(() => finalize(), RECORD_MS);
    }, WARMUP_MS);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── registrar frame ─────────────────────────────────────────────────────────
  const addFrame = useCallback((
    tCaptura: number,
    tPre: number,
    tInfer: number,
    tPos: number,
    numDet: number,
    tsMs: number,
  ) => {
    if (phaseRef.current !== 'recording') return;
    const fps = lastFrameTs.current > 0 ? 1000 / (tsMs - lastFrameTs.current) : 0;
    lastFrameTs.current = tsMs;
    frameRows.current.push({
      timestamp_ms: tsMs,
      indice_quadro: frameIndex.current++,
      t_captura_ms: tCaptura,
      t_preprocessamento_ms: tPre,
      t_inferencia_ms: tInfer,
      t_posprocessamento_ms: tPos,
      t_total_ms: tCaptura + tPre + tInfer + tPos,
      fps_instantaneo: fps,
      num_deteccoes_acima_do_limiar: numDet,
    });
  }, []);

  // ── registrar evento de detecção ────────────────────────────────────────────
  const addDetectionEvent = useCallback((ev: DetectionEvent) => {
    if (phaseRef.current !== 'recording') return;
    detectionEvents.current.push(ev);
  }, []);

  // ── marcar quando fala iniciou ──────────────────────────────────────────────
  const markSpeechStarted = useCallback((classe: string, startedAt: number) => {
    if (phaseRef.current !== 'recording') return;
    const ev = [...detectionEvents.current]
      .reverse()
      .find(e => e.classe_detectada === classe && e.fala_iniciou === 'nao');
    if (ev) {
      ev.fala_iniciou = 'sim';
      ev.tempo_deteccao_ate_fala_ms = f(startedAt - ev.detectedAt);
    }
  }, []);

  // ── finalizar sessão ────────────────────────────────────────────────────────
  const finalize = useCallback(() => {
    if (warmupTimer.current) { clearTimeout(warmupTimer.current); warmupTimer.current = null; }
    if (recordTimer.current) { clearTimeout(recordTimer.current); recordTimer.current = null; }
    if (countdownTimer.current) { clearInterval(countdownTimer.current); countdownTimer.current = null; }

    const cfg = configRef.current!;

    if (cfg.objetosEsperados.length === 0 && detectionEvents.current.length === 0) {
      detectionEvents.current.push({
        timestamp_ms: Date.now(),
        classe_detectada: '',
        confianca: 0,
        bbox_x: 0, bbox_y: 0, bbox_largura: 0, bbox_altura: 0,
        isolado: 'nao',
        detectou_esperado: 'nao_aplicavel',
        texto_narrado: '',
        detectedAt: 0,
        tempo_deteccao_ate_fala_ms: 0,
        fala_iniciou: 'nao',
      });
    }

    const frames = frameRows.current;
    const events = detectionEvents.current;
    const esperados = events.filter(e => e.detectou_esperado === 'sim').length;
    const aplicaveis = events.filter(e => e.detectou_esperado !== 'nao_aplicavel').length;

    // agrupa objetos detectados com confiança >= 50%
    const mapaObjetos = new Map<string, { total: number; somaConf: number; maxConf: number }>();
    for (const e of events) {
      if (!e.classe_detectada) continue;
      const entry = mapaObjetos.get(e.classe_detectada) ?? { total: 0, somaConf: 0, maxConf: 0 };
      entry.total++;
      entry.somaConf += e.confianca;
      entry.maxConf = Math.max(entry.maxConf, e.confianca);
      mapaObjetos.set(e.classe_detectada, entry);
    }
    const objetosDetectados: ObjetoDetectado[] = [...mapaObjetos.entries()]
      .map(([classe, v]) => ({
        classe,
        ocorrencias: v.total,
        confianca_media: f(v.somaConf / v.total),
        confianca_max: f(v.maxConf),
      }))
      .sort((a, b) => b.ocorrencias - a.ocorrencias);

    const sum: SessionSummary = {
      totalFrames: frames.length,
      totalEventos: events.length,
      taxaDetectouEsperado: aplicaveis > 0
        ? `${((esperados / aplicaveis) * 100).toFixed(1)}%` : 'N/A',
      objetosDetectados,
      fps: summarize(frames.map(r => r.fps_instantaneo).filter(v => v > 0)),
      pre: summarize(frames.map(r => r.t_preprocessamento_ms)),
      infer: summarize(frames.map(r => r.t_inferencia_ms)),
      total: summarize(frames.map(r => r.t_total_ms)),
    };

    summaryRef.current = sum;
    setSummary(sum);
    setPhase('done');
    onDoneRef.current?.();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── exportar JSON ───────────────────────────────────────────────────────────
  const exportJson = useCallback(async () => {
    const cfg = configRef.current!;
    const sid = sessionId.current;
    const sum = summaryRef.current!;
    const modelo = `${Device.brand ?? ''} ${Device.modelName ?? ''}`.trim();

    const payload = {
      sessao: {
        id: sid,
        id_caso_teste: cfg.idCasoTeste,
        observacao: cfg.observacao,
        distancia_m: null,   // preencher manualmente
        dispositivo: { modelo, android: Device.osVersion ?? '' },
      },
      objetos_esperados: cfg.objetosEsperados,
      objetos_detectados: sum.objetosDetectados,
      metricas: {
        total_frames: sum.totalFrames,
        total_eventos: sum.totalEventos,
        taxa_detectou_esperado: sum.taxaDetectouEsperado,
        fps:   sum.fps,
        pre_ms: sum.pre,
        infer_ms: sum.infer,
        total_ms: sum.total,
      },
      frames: frameRows.current,
      eventos: detectionEvents.current,
    };

    const fileUri = FileSystem.documentDirectory + 'sessoes.json';
    const info = await FileSystem.getInfoAsync(fileUri);
    const existing: typeof payload[] = info.exists
      ? JSON.parse(await FileSystem.readAsStringAsync(fileUri))
      : [];
    existing.push(payload);
    await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(existing, null, 2));

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, { mimeType: 'application/json', dialogTitle: 'Exportar sessão TCC' });
    }
  }, []);

  const reset = useCallback(() => {
    if (warmupTimer.current) clearTimeout(warmupTimer.current);
    if (recordTimer.current) clearTimeout(recordTimer.current);
    if (countdownTimer.current) clearInterval(countdownTimer.current);
    frameRows.current = [];
    detectionEvents.current = [];
    summaryRef.current = null;
    setSummary(null);
    setCountdown(0);
    setPhase('idle');
  }, [setPhase]);

  return {
    phase,
    countdown,
    summary,
    start,
    addFrame,
    addDetectionEvent,
    markSpeechStarted,
    exportJson,
    reset,
  };
}
