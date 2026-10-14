import { useCallback, useRef, useState } from 'react';
import { summarize, type Stats } from '../utils/stats';

export type Sample = {
  pre: number;    // resize + cópia do buffer (ms)
  infer: number;  // inferência (ms)
  total: number;  // pre + infer (ms)
  end: number;    // instante do fim do frame (ms), pra calcular FPS
  nDet: number;   // detecções com score > 0.5
};
export type Phase = 'idle' | 'warmup' | 'recording' | 'done';
export type Summary = {
  frames: number;
  fps: number;
  total: Stats;
  infer: Stats;
  pre: Stats;
  meanDet: number;
};

const WARMUP_MS = 5000;
const RECORD_MS = 60000;

function compute(xs: Sample[]): Summary | null {
  if (xs.length < 2) return null;
  const durS = (xs[xs.length - 1].end - xs[0].end) / 1000;
  return {
    frames: xs.length,
    fps: (xs.length - 1) / durS,
    total: summarize(xs.map((s) => s.total)),
    infer: summarize(xs.map((s) => s.infer)),
    pre: summarize(xs.map((s) => s.pre)),
    meanDet: xs.reduce((a, s) => a + s.nDet, 0) / xs.length,
  };
}

const f = (x: number) => x.toFixed(2);
const clean = (t: string) => t.replace(/[,\n]/g, ' ');

export function useBenchmark(model: string, delegate: string) {
  const [phase, setPhaseState] = useState<Phase>('idle');
  const [summary, setSummary] = useState<Summary | null>(null);
  const phaseRef = useRef<Phase>('idle');
  const samples = useRef<Sample[]>([]);

  const setPhase = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhaseState(p);
  }, []);

  const onSample = useCallback((s: Sample) => {
    if (phaseRef.current === 'recording') samples.current.push(s);
  }, []);

  const start = useCallback(() => {
    if (phaseRef.current === 'warmup' || phaseRef.current === 'recording') return;
    samples.current = [];
    setSummary(null);
    setPhase('warmup');
    setTimeout(() => {
      samples.current = []; // descarta o aquecimento
      setPhase('recording');
      setTimeout(() => {
        setPhase('done');
        setSummary(compute(samples.current));
      }, RECORD_MS);
    }, WARMUP_MS);
  }, [setPhase]);

  const summaryCsv = (cond: string) => {
    if (!summary) return '';
    const s = summary;
    const head =
      'modelo,delegate,condicao,frames,fps,total_media_ms,total_mediana_ms,total_p95_ms,total_dp_ms,infer_media_ms,infer_mediana_ms,infer_p95_ms,pre_media_ms,deteccoes_media';
    const row = [
      model, delegate, clean(cond), s.frames, f(s.fps),
      f(s.total.mean), f(s.total.median), f(s.total.p95), f(s.total.std),
      f(s.infer.mean), f(s.infer.median), f(s.infer.p95),
      f(s.pre.mean), f(s.meanDet),
    ].join(',');
    return `${head}\n${row}`;
  };

  const rawCsv = (cond: string) => {
    const xs = samples.current;
    if (!xs.length) return '';
    const t0 = xs[0].end;
    const head = 'modelo,delegate,condicao,t_ms,pre_ms,infer_ms,total_ms,deteccoes';
    const rows = xs.map((s) =>
      [model, delegate, clean(cond), f(s.end - t0), f(s.pre), f(s.infer), f(s.total), s.nDet].join(',')
    );
    return [head, ...rows].join('\n');
  };

  return { phase, summary, start, onSample, summaryCsv, rawCsv };
}