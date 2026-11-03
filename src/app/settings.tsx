import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../context/ThemeContext';
import { type AppTheme, type FontSizeKey } from './theme/colors';

function SectionLabel({ text, theme, fs }: { text: string; theme: AppTheme; fs: { xs: number } }) {
  return (
    <Text style={[styles.sectionLabel, { color: theme.accent, fontSize: fs.xs }]}>{text}</Text>
  );
}

function Card({ children, theme }: { children: React.ReactNode; theme: AppTheme }) {
  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      {children}
    </View>
  );
}

function Divider({ theme }: { theme: AppTheme }) {
  return <View style={[styles.divider, { backgroundColor: theme.border }]} />;
}

function ToggleRow({
  label, value, onToggle, icon, color, description, theme, fs,
}: {
  label: string; value: boolean; onToggle: () => void;
  icon: keyof typeof Ionicons.glyphMap; color: string; description?: string;
  theme: AppTheme; fs: { md: number; sm: number; touchTarget: number };
}) {
  return (
    <View style={[styles.row, { minHeight: fs.touchTarget }]}>
      <View style={[styles.rowIcon, { backgroundColor: color + '22', borderColor: color + '50' }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, { color: theme.text, fontSize: fs.md }]}>{label}</Text>
        {description && <Text style={[styles.rowDesc, { color: theme.textMuted, fontSize: fs.sm }]}>{description}</Text>}
      </View>
      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: value }}
        accessibilityLabel={`${label}: ${value ? 'ativado' : 'desativado'}`}
        onPress={onToggle}
        style={[styles.toggle, { backgroundColor: value ? theme.accentStrong : theme.border }]}
        hitSlop={8}
      >
        <View style={[styles.toggleThumb, { left: value ? 28 : 4 }]} />
      </Pressable>
    </View>
  );
}

const FONT_OPTIONS: { label: string; value: FontSizeKey; desc: string }[] = [
  { label: 'Médio',  value: 'medio',  desc: 'Corpo 18pt' },
  { label: 'Grande', value: 'grande', desc: 'Corpo 22pt' },
  { label: 'Extra',  value: 'extra',  desc: 'Corpo 26pt' },
];

function FontSizeRow({
  value, onChange, theme, fs,
}: {
  value: FontSizeKey;
  onChange: (v: FontSizeKey) => void;
  theme: AppTheme;
  fs: { xs: number; sm: number; md: number; lg: number; touchTarget: number; xl: number; lineHeightRatio: number };
}) {
  return (
    <View style={styles.fontSizeWrapper}>
      {/* Header da linha */}
      <View style={styles.row}>
        <View style={[styles.rowIcon, { backgroundColor: theme.info + '22', borderColor: theme.info + '50' }]}>
          <Ionicons name="text-outline" size={22} color={theme.info} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.rowLabel, { color: theme.text, fontSize: fs.md }]}>Tamanho da fonte</Text>
          <Text style={[styles.rowDesc, { color: theme.textMuted, fontSize: fs.sm }]}>
            Afeta todo o texto do aplicativo
          </Text>
        </View>
      </View>

      {/* Cards de opção */}
      <View style={styles.fontCards}>
        {FONT_OPTIONS.map(opt => {
          const active = value === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => onChange(opt.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`Tamanho da fonte: ${opt.label}, ${opt.desc}`}
              style={[
                styles.fontCard,
                { minHeight: fs.touchTarget, borderColor: active ? theme.accent : theme.border },
                active && { backgroundColor: theme.accentDim },
              ]}
            >
              {/* Amostra visual do tamanho */}
              <Text
                style={{ color: active ? theme.accent : theme.textSubtle, fontWeight: '800' }}
                // cada card mostra o tamanho real que representa
                numberOfLines={1}
              >
                {opt.value === 'medio' ? 'Aa' : opt.value === 'grande' ? 'Aa' : 'Aa'}
              </Text>
              <Text style={[styles.fontCardLabel, { color: active ? theme.text : theme.textMuted, fontSize: fs.sm, fontWeight: active ? '800' : '500' }]}>
                {opt.label}
              </Text>
              <Text style={[styles.fontCardDesc, { color: active ? theme.textMuted : theme.textSubtle, fontSize: fs.xs }]}>
                {opt.desc}
              </Text>
              {active && (
                <View style={[styles.fontCardCheck, { backgroundColor: theme.accentStrong }]}>
                  <Ionicons name="checkmark" size={12} color="#fff" />
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function Settings() {
  const { theme, isDark, toggleTheme, fontSizeKey, fs, setFontSize } = useAppTheme();
  const [voice, setVoice] = useState('feminina');
  const [vibration, setVibration] = useState(true);

  const voiceOptions = [
    { label: 'Feminina', value: 'feminina' },
    { label: 'Masculina', value: 'masculina' },
    { label: 'Neutra', value: 'neutra' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar style={theme.statusBar} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          accessibilityLabel="Voltar para a tela principal"
          style={({ pressed }) => [
            styles.backBtn,
            { backgroundColor: theme.surfaceAlt, borderColor: theme.border, minWidth: fs.touchTarget, minHeight: fs.touchTarget },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.title, { color: theme.text, fontSize: fs.xxl }]}>Configurações</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>

        <SectionLabel text="Aparência" theme={theme} fs={fs} />
        <Card theme={theme}>
          <ToggleRow
            label="Modo escuro"
            value={isDark}
            onToggle={toggleTheme}
            icon={isDark ? 'moon-outline' : 'sunny-outline'}
            color={theme.accent}
            description={isDark ? 'Fundo escuro para menor fadiga ocular' : 'Fundo claro com alto contraste WCAG'}
            theme={theme}
            fs={fs}
          />
          <Divider theme={theme} />
          <FontSizeRow value={fontSizeKey} onChange={setFontSize} theme={theme} fs={fs} />
        </Card>

        <SectionLabel text="Voz e Áudio" theme={theme} fs={fs} />
        <Card theme={theme}>
          <View style={styles.segmentedWrapper}>
            <View style={styles.row}>
              <View style={[styles.rowIcon, { backgroundColor: theme.success + '22', borderColor: theme.success + '50' }]}>
                <Ionicons name="mic-outline" size={22} color={theme.success} />
              </View>
              <Text style={[styles.rowLabel, { color: theme.text, fontSize: fs.md }]}>Voz</Text>
            </View>
            <View style={styles.segmentedRow}>
              {voiceOptions.map(opt => {
                const active = voice === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => setVoice(opt.value)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`Voz: ${opt.label}`}
                    style={[
                      styles.segment,
                      { minHeight: fs.touchTarget },
                      active
                        ? { backgroundColor: theme.accentStrong, borderColor: theme.accent }
                        : { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
                    ]}
                  >
                    <Text style={[styles.segmentText, { fontSize: fs.sm, color: active ? '#fff' : theme.textMuted, fontWeight: active ? '800' : '500' }]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    paddingHorizontal: 28, paddingTop: 56, paddingBottom: 8,
  },
  backBtn: {
    borderRadius: 16, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontWeight: '800' },
  scrollContent: { paddingHorizontal: 28, paddingBottom: 48 },
  sectionLabel: {
    fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.5,
    marginTop: 28, marginBottom: 10,
  },
  card: { borderWidth: 1.5, borderRadius: 22, paddingHorizontal: 20 },
  divider: { height: 1, marginHorizontal: -4 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    gap: 14, paddingVertical: 20,
  },
  rowIcon: {
    width: 48, height: 48, borderRadius: 14,
    borderWidth: 2, alignItems: 'center', justifyContent: 'center',
  },
  rowLabel: { fontWeight: '700' },
  rowDesc: { marginTop: 2 },
  toggle: { width: 56, height: 32, borderRadius: 16, position: 'relative' },
  toggleThumb: {
    position: 'absolute', top: 4,
    width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4, shadowRadius: 4, elevation: 4,
  },
  // Font size
  fontSizeWrapper: { paddingBottom: 20 },
  fontCards: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  fontCard: {
    flex: 1, borderRadius: 16, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, gap: 4, position: 'relative',
  },
  fontCardLabel: { textAlign: 'center' },
  fontCardDesc: { textAlign: 'center' },
  fontCardCheck: {
    position: 'absolute', top: 6, right: 6,
    width: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  fontPreview: {
    borderRadius: 16, borderWidth: 1.5,
    padding: 16, gap: 6,
  },
  fontPreviewLabel: {
    fontWeight: '700', letterSpacing: 1.2, marginBottom: 4,
  },
  // Voice
  segmentedWrapper: { paddingVertical: 20 },
  segmentedRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  segment: {
    flex: 1, borderRadius: 14, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  segmentText: {},
});
