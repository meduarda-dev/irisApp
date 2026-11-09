import * as Device from 'expo-device';
import * as FileSystem from 'expo-file-system';
import { useCallback, useRef, useState } from 'react';
import { summarize } from '../utils/stats';

// ─── tipos públicos ────────────────────────────────────────────────────────────

export type TccPhase = 'idle' | 'warmup' | 'recording' | 'done';

export type SessionConfig = {
  idCasoTeste: string;
  objetoEsperado: string;
  distancia_m: number;
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
  tempo_deteccao_ate_fala_ms: string;
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

export type SessionSummary = {
  totalFrames: number;
  totalEventos: number;
  taxaDetectouEsperado: string;
  fps: { mean: number; median: number; p95: number; std: number };
  pre: { mean: number; median: number; p95: number; std: number };
  infer: { mean: number; median: number; p95: number; std: number };
  total: { mean: number; median: number; p95: number; std: number };
};

// ─── constantes ───────────────────────────────────────────────────────────────

const WARMUP_MS = 5_000;
const RECORD_MS = 60_000;
const f = (n: number) => n.toFixed(3);
const esc = (s: string) => `"${String(s).replace(/"/g, '""')}"`;

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

    if (cfg.objetoEsperado === '' && detectionEvents.current.length === 0) {
      detectionEvents.current.push({
        timestamp_ms: Date.now(),
        classe_detectada: '',
        confianca: 0,
        bbox_x: 0, bbox_y: 0, bbox_largura: 0, bbox_altura: 0,
        isolado: 'nao',
        detectou_esperado: 'nao_aplicavel',
        texto_narrado: '',
        detectedAt: 0,
        tempo_deteccao_ate_fala_ms: '',
        fala_iniciou: 'nao',
      });
    }

    const frames = frameRows.current;
    const events = detectionEvents.current;
    const esperados = events.filter(e => e.detectou_esperado === 'sim').length;
    const aplicaveis = events.filter(e => e.detectou_esperado !== 'nao_aplicavel').length;

    const sum: SessionSummary = {
      totalFrames: frames.length,
      totalEventos: events.length,
      taxaDetectouEsperado: aplicaveis > 0
        ? `${((esperados / aplicaveis) * 100).toFixed(1)}%` : 'N/A',
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

  // ── exportar CSVs ───────────────────────────────────────────────────────────
  const exportCsvs = useCallback(async () => {
    const cfg = configRef.current!;
    const sid = sessionId.current;
    const sum = summaryRef.current!;
    const modelo = `${Device.brand ?? ''} ${Device.modelName ?? ''}`.trim();
    const android = String(Device.osVersion ?? '');
    const dir = FileSystem.documentDirectory;

    // desempenho_frames.csv
    const frameHead = [
      'id_sessao','id_caso_teste','modelo_aparelho','versao_android',
      'timestamp_ms','indice_quadro','t_captura_ms','t_preprocessamento_ms',
      't_inferencia_ms','t_posprocessamento_ms','t_total_ms',
      'fps_instantaneo','num_deteccoes_acima_do_limiar',
    ].join(',');
    const frameBody = frameRows.current.map(r => [
      sid, esc(cfg.idCasoTeste), esc(modelo), android,
      r.timestamp_ms, r.indice_quadro,
      f(r.t_captura_ms), f(r.t_preprocessamento_ms),
      f(r.t_inferencia_ms), f(r.t_posprocessamento_ms), f(r.t_total_ms),
      f(r.fps_instantaneo), r.num_deteccoes_acima_do_limiar,
    ].join(',')).join('\n');
    const framePath = `${dir}desempenho_frames_${sid}.csv`;
    await FileSystem.writeAsStringAsync(framePath, `${frameHead}\n${frameBody}`, { encoding: FileSystem.EncodingType.UTF8 });

    // eventos_deteccao.csv
    const evHead = [
      'id_sessao','id_caso_teste','timestamp_ms','classe_detectada','confianca',
      'bbox_x','bbox_y','bbox_largura','bbox_altura','distancia_m','objeto_esperado',
      'isolado','detectou_esperado','texto_narrado','tempo_deteccao_ate_fala_ms',
      'fala_iniciou','observacao','descricao_correta',
    ].join(',');
    const evBody = detectionEvents.current.map(e => [
      sid, esc(cfg.idCasoTeste), e.timestamp_ms,
      esc(e.classe_detectada), f(e.confianca),
      f(e.bbox_x), f(e.bbox_y), f(e.bbox_largura), f(e.bbox_altura),
      cfg.distancia_m, esc(cfg.objetoEsperado),
      e.isolado, e.detectou_esperado,
      esc(e.texto_narrado), e.tempo_deteccao_ate_fala_ms,
      e.fala_iniciou, esc(cfg.observacao), '',
    ].join(',')).join('\n');
    const evPath = `${dir}eventos_deteccao_${sid}.csv`;
    await FileSystem.writeAsStringAsync(evPath, `${evHead}\n${evBody}`, { encoding: FileSystem.EncodingType.UTF8 });

    // resumo_sessoes.csv (append)
    const resumoPath = `${dir}resumo_sessoes.csv`;
    const resumoHead = [
      'id_sessao','id_caso_teste','modelo_aparelho','versao_android',
      'distancia_m','objeto_esperado','observacao',
      'total_frames','total_eventos','taxa_detectou_esperado',
      'fps_media','fps_mediana','fps_p95','fps_dp',
      'pre_media_ms','pre_mediana_ms','pre_p95_ms','pre_dp_ms',
      'infer_media_ms','infer_mediana_ms','infer_p95_ms','infer_dp_ms',
      'total_media_ms','total_mediana_ms','total_p95_ms','total_dp_ms',
    ].join(',');
    const resumoRow = [
      sid, esc(cfg.idCasoTeste), esc(modelo), android,
      cfg.distancia_m, esc(cfg.objetoEsperado), esc(cfg.observacao),
      sum.totalFrames, sum.totalEventos, sum.taxaDetectouEsperado,
      f(sum.fps.mean), f(sum.fps.median), f(sum.fps.p95), f(sum.fps.std),
      f(sum.pre.mean), f(sum.pre.median), f(sum.pre.p95), f(sum.pre.std),
      f(sum.infer.mean), f(sum.infer.median), f(sum.infer.p95), f(sum.infer.std),
      f(sum.total.mean), f(sum.total.median), f(sum.total.p95), f(sum.total.std),
    ].join(',');

    const existing = await FileSystem.getInfoAsync(resumoPath);
    const resumoContent = existing.exists
      ? `${(await FileSystem.readAsStringAsync(resumoPath)).trimEnd()}\n${resumoRow}`
      : `${resumoHead}\n${resumoRow}`;
    await FileSystem.writeAsStringAsync(resumoPath, resumoContent, { encoding: FileSystem.EncodingType.UTF8 });

    // compartilhar sequencialmente
    const Sharing = await import('expo-sharing');
    for (const path of [framePath, evPath, resumoPath]) {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(path, { mimeType: 'text/csv', dialogTitle: 'Exportar CSV' });
      }
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
    exportCsvs,
    reset,
  };
}
