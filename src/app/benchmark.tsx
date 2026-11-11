import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Platform,
  Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { useAppTheme } from '../context/ThemeContext';
import { useTcc } from '../context/TccContext';
import { type SessionConfig, type SessionSummary } from '../detection/useTccSession';

// A tela de benchmark recebe o resumo via params quando a sessão termina
// e também serve como formulário de configuração antes de iniciar.

export default function BenchmarkScreen() {
  const { theme, fs } = useAppTheme();
  const tcc = useTcc();
  const params = useLocalSearchParams<{ summary?: string }>();

  const [idCasoTeste, setIdCasoTeste] = useState('CT01');
  const [objetosInput, setObjetosInput] = useState('');   // ex: "pessoa, cadeira"
  const [observacao, setObservacao] = useState('');
  const [exporting, setExporting] = useState(false);

  // usa o resumo do contexto (sessão ainda viva) ou o que veio nos params
  const summaryData: SessionSummary | null = tcc.summary ?? (
    params.summary ? (() => { try { return JSON.parse(params.summary); } catch { return null; } })() : null
  );

  const handleExport = async () => {
    setExporting(true);
    try {
      await tcc.exportJson();
    } catch (e) {
      Alert.alert('Erro ao exportar', String(e));
    } finally {
      setExporting(false);
    }
  };

  const canStart = idCasoTeste.trim().length > 0;

  const handleStart = () => {
    const objetosEsperados = objetosInput
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);
    const cfg: SessionConfig = {
      idCasoTeste: idCasoTeste.trim(),
      objetosEsperados,
      observacao: observacao.trim(),
    };
    router.push({ pathname: '/camera', params: { tccConfig: JSON.stringify(cfg) } });
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style={theme.statusBar} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backBtn,
            { backgroundColor: theme.surfaceAlt, borderColor: theme.border,
              minWidth: fs.touchTarget, minHeight: fs.touchTarget },
            pressed && { opacity: 0.7 },
          ]}
          accessibilityLabel="Voltar"
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.title, { color: theme.text, fontSize: fs.xl }]}>
          Modo de Medição
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Formulário */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.accent, fontSize: fs.xs }]}>
            CONFIGURAÇÃO DA SESSÃO
          </Text>

          <Field label="ID do caso de teste *" hint="ex.: CT01">
            <TextInput
              value={idCasoTeste}
              onChangeText={setIdCasoTeste}
              style={[styles.input, { color: theme.text, borderColor: theme.border, fontSize: fs.md }]}
              placeholderTextColor={theme.textSubtle}
              placeholder="CT01"
              autoCapitalize="characters"
            />
          </Field>

          <Field label="Objetos esperados" hint="nomes em português separados por vírgula, ex.: pessoa, cadeira">
            <TextInput
              value={objetosInput}
              onChangeText={setObjetosInput}
              style={[styles.input, { color: theme.text, borderColor: theme.border, fontSize: fs.md }]}
              placeholderTextColor={theme.textSubtle}
              placeholder="pessoa, cadeira"
              autoCapitalize="none"
            />
          </Field>

          <Field label="Observação" hint="opcional">
            <TextInput
              value={observacao}
              onChangeText={setObservacao}
              style={[styles.input, styles.inputMulti,
                { color: theme.text, borderColor: theme.border, fontSize: fs.md }]}
              placeholderTextColor={theme.textSubtle}
              placeholder="Ambiente interno, luz natural..."
              multiline
              numberOfLines={3}
            />
          </Field>
        </View>

        {/* Info da sessão */}
        <View style={[styles.infoBox, { backgroundColor: theme.accentDim, borderColor: theme.accentBorder }]}>
          <Ionicons name="information-circle-outline" size={18} color={theme.accent} />
          <Text style={[styles.infoText, { color: theme.textMuted, fontSize: fs.sm }]}>
            5 s de aquecimento (não gravados) + 30 s de gravação. A sessão encerra automaticamente.
          </Text>
        </View>

        {/* Botão iniciar */}
        <Pressable
          onPress={handleStart}
          disabled={!canStart}
          style={({ pressed }) => [
            styles.startBtn,
            { backgroundColor: canStart ? theme.accentStrong : theme.border,
              minHeight: fs.touchTarget + 16 },
            pressed && { opacity: 0.85 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Iniciar sessão de medição"
        >
          <Ionicons name="play-circle-outline" size={26} color="#fff" />
          <Text style={[styles.startBtnText, { fontSize: fs.lg }]}>Iniciar Sessão</Text>
        </Pressable>

        {/* Resumo da última sessão */}
        {summaryData && (
          <>
            <SummaryCard summary={summaryData} theme={theme} fs={fs} />

            {/* Botão exportar */}
            <Pressable
              onPress={handleExport}
              disabled={exporting}
              style={({ pressed }) => [
                styles.exportBtn,
                { backgroundColor: theme.successDim, borderColor: theme.successBorder,
                  minHeight: fs.touchTarget + 8, opacity: exporting ? 0.6 : 1 },
                pressed && { opacity: 0.75 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Exportar CSVs da sessão"
            >
              <Ionicons name="share-outline" size={22} color={theme.success} />
              <Text style={[styles.exportBtnText, { color: theme.success, fontSize: fs.md }]}>
                {exporting ? 'Exportando...' : 'Exportar JSON'}
              </Text>
            </Pressable>

            {/* Botão nova sessão */}
            <Pressable
              onPress={() => tcc.reset()}
              style={({ pressed }) => [
                styles.resetBtn,
                { borderColor: theme.border, minHeight: fs.touchTarget + 8 },
                pressed && { opacity: 0.7 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Limpar e iniciar nova sessão"
            >
              <Ionicons name="refresh-outline" size={20} color={theme.textMuted} />
              <Text style={[styles.resetBtnText, { color: theme.textMuted, fontSize: fs.sm }]}>
                Nova sessão
              </Text>
            </Pressable>
          </>
        )}

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── componentes auxiliares ───────────────────────────────────────────────────

function Field({ label, hint, children }: {
  label: string; hint?: string; children: React.ReactNode;
}) {
  const { theme, fs } = useAppTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: theme.text, fontSize: fs.sm }]}>{label}</Text>
      {hint && <Text style={[styles.fieldHint, { color: theme.textSubtle, fontSize: fs.xs }]}>{hint}</Text>}
      {children}
    </View>
  );
}

function SummaryCard({ summary: s, theme, fs }: {
  summary: SessionSummary;
  theme: any;
  fs: any;
}) {
  return (
    <View style={[styles.summaryCard, { backgroundColor: theme.surface, borderColor: theme.successBorder }]}>
      <Text style={[styles.cardTitle, { color: theme.success, fontSize: fs.xs }]}>
        RESUMO DA ÚLTIMA SESSÃO
      </Text>

      <Row label="Frames gravados" value={String(s.totalFrames)} theme={theme} fs={fs} />
      <Row label="Eventos de detecção" value={String(s.totalEventos)} theme={theme} fs={fs} />
      <Row label="Taxa detectou esperado" value={s.taxaDetectouEsperado} theme={theme} fs={fs} />

      <Text style={[styles.subTitle, { color: theme.textMuted, fontSize: fs.xs }]}>FPS</Text>
      <StatsRow stats={s.fps} theme={theme} fs={fs} />

      <Text style={[styles.subTitle, { color: theme.textMuted, fontSize: fs.xs }]}>Pré-processamento (ms)</Text>
      <StatsRow stats={s.pre} theme={theme} fs={fs} />

      <Text style={[styles.subTitle, { color: theme.textMuted, fontSize: fs.xs }]}>Inferência (ms)</Text>
      <StatsRow stats={s.infer} theme={theme} fs={fs} />

      <Text style={[styles.subTitle, { color: theme.textMuted, fontSize: fs.xs }]}>Total (ms)</Text>
      <StatsRow stats={s.total} theme={theme} fs={fs} />
    </View>
  );
}

function Row({ label, value, theme, fs }: { label: string; value: string; theme: any; fs: any }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, { color: theme.textMuted, fontSize: fs.sm }]}>{label}</Text>
      <Text style={[styles.summaryValue, { color: theme.text, fontSize: fs.sm }]}>{value}</Text>
    </View>
  );
}

function StatsRow({ stats, theme, fs }: { stats: { mean: number; median: number; p95: number; std: number }; theme: any; fs: any }) {
  return (
    <View style={styles.statsRow}>
      {[
        { k: 'Média', v: stats.mean },
        { k: 'Mediana', v: stats.median },
        { k: 'P95', v: stats.p95 },
        { k: 'DP', v: stats.std },
      ].map(({ k, v }) => (
        <View key={k} style={styles.statCell}>
          <Text style={[styles.statKey, { color: theme.textSubtle, fontSize: fs.xs }]}>{k}</Text>
          <Text style={[styles.statVal, { color: theme.text, fontSize: fs.sm }]}>{v.toFixed(1)}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    paddingHorizontal: 28, paddingTop: 56, paddingBottom: 8,
  },
  backBtn: { borderRadius: 16, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  title: { fontWeight: '800' },
  scroll: { paddingHorizontal: 28, paddingBottom: 48, gap: 16 },
  card: { borderWidth: 1.5, borderRadius: 22, padding: 20, gap: 4 },
  cardTitle: { fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8 },
  field: { gap: 4, marginBottom: 14 },
  fieldLabel: { fontWeight: '700' },
  fieldHint: { marginBottom: 2 },
  input: {
    borderWidth: 1.5, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  inputMulti: { minHeight: 80, textAlignVertical: 'top' },
  infoBox: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    borderWidth: 1.5, borderRadius: 16, padding: 14,
  },
  infoText: { flex: 1, lineHeight: 20 },
  startBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
    borderRadius: 22,
    shadowColor: '#7c5ce8', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4, shadowRadius: 16, elevation: 8,
  },
  startBtnText: { color: '#fff', fontWeight: '800' },
  exportBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    borderRadius: 22, borderWidth: 2,
  },
  exportBtnText: { fontWeight: '800' },
  resetBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 22, borderWidth: 1.5,
  },
  resetBtnText: { fontWeight: '600' },
  summaryCard: { borderWidth: 2, borderRadius: 22, padding: 20, gap: 4 },
  subTitle: { fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginTop: 10, marginBottom: 4 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  summaryLabel: {},
  summaryValue: { fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 8 },
  statCell: { flex: 1, alignItems: 'center' },
  statKey: {},
  statVal: { fontWeight: '700' },
});
