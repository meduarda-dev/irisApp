import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../context/ThemeContext';

const SLIDES = [
  {
    icon: 'eye-outline' as const,
    accent: '#9d7ff4',
    title: 'Detecta Obstáculos',
    description:
      'A câmera do celular identifica objetos e obstáculos ao redor em tempo real, usando Inteligência Artificial que funciona sem internet.',
  },
  {
    icon: 'location-outline' as const,
    accent: '#5b9cf6',
    title: 'Navegação Segura',
    description:
      'O Íris identifica os objetos mais próximos e fala o nome de cada um em voz alta, para você saber o que está ao redor sem precisar ver.',
  },
  {
    icon: 'volume-high-outline' as const,
    accent: '#4ecdc4',
    title: 'Fala em Português',
    description:
      'Todos os alertas são falados em português brasileiro. Sem precisar olhar para a tela, o Íris fala por você.',
  },
];

export default function Onboarding() {
  const { theme, fs } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState(0);
  const slide = SLIDES[current];

  const next = () => {
    if (current < SLIDES.length - 1) {
      setCurrent(current + 1);
    } else {
      router.replace('/home');
    }
  };

  // No modo claro os accents dos slides precisam de versões mais escuras para manter contraste
  const accentColor = theme.dark ? slide.accent : theme.accent;

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar style={theme.statusBar} />

      {/* Skip */}
      <View style={styles.skipRow}>
        {current < SLIDES.length - 1 && (
          <Pressable
            onPress={() => router.replace('/home')}
            accessibilityLabel="Pular introdução"
            style={({ pressed }) => [styles.skipBtn, pressed && { opacity: 0.6 }]}
          >
            <Text style={[styles.skipText, { color: theme.textMuted, fontSize: fs.md }]}>Pular introdução</Text>
          </Pressable>
        )}
      </View>

      {/* Illustration orb */}
      <View style={styles.orbWrapper}>
        <View style={[styles.orb, { borderColor: accentColor + '40', backgroundColor: accentColor + '15' }]}>
          <Ionicons name={slide.icon} size={80} color={accentColor} />
        </View>
      </View>

      {/* Text */}
      <View style={styles.textBlock}>
        <View style={[styles.tag, { backgroundColor: accentColor + '20', borderColor: accentColor + '50' }]}>
          <Ionicons name={slide.icon} size={16} color={accentColor} />
          <Text style={[styles.tagText, { color: accentColor, fontSize: fs.sm }]}>
            {current + 1} de {SLIDES.length}
          </Text>
        </View>
        <Text style={[styles.heading, { color: theme.text, fontSize: fs.xxl }]}>{slide.title}</Text>
        <Text style={[styles.body, { color: theme.textMuted, fontSize: fs.md, lineHeight: fs.md * fs.lineHeightRatio }]}>{slide.description}</Text>
      </View>

      {/* Bottom */}
      <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 60) }]}>
        {/* Dots */}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <Pressable
              key={i}
              onPress={() => setCurrent(i)}
              accessibilityLabel={`Slide ${i + 1} de ${SLIDES.length}`}
              style={[
                styles.dot,
                i === current
                  ? { width: 28, backgroundColor: accentColor }
                  : { width: 10, backgroundColor: theme.border },
              ]}
            />
          ))}
        </View>

        {/* CTA */}
        <Pressable
          onPress={next}
          style={({ pressed }) => [styles.cta, { backgroundColor: theme.accentStrong, minHeight: fs.touchTarget }, pressed && { opacity: 0.85 }]}
          accessibilityRole="button"
          accessibilityLabel={current < SLIDES.length - 1 ? 'Próximo slide' : 'Começar a usar o Íris'}
        >
          <Text style={[styles.ctaText, { fontSize: fs.lg }]}>
            {current < SLIDES.length - 1 ? 'Próximo' : 'Começar'}
          </Text>
          {current < SLIDES.length - 1 && (
            <Ionicons name="chevron-forward" size={22} color="#fff" />
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  skipRow: {
    alignItems: 'flex-end',
    paddingHorizontal: 24, paddingTop: 56, minHeight: 80,
  },
  skipBtn: {
    paddingHorizontal: 6, paddingVertical: 10,
    minWidth: 48, minHeight: 48,
    alignItems: 'center', justifyContent: 'center',
  },
  skipText: { fontSize: 17, fontWeight: '600' },
  orbWrapper: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  orb: {
    width: 220, height: 220, borderRadius: 110,
    borderWidth: 2, alignItems: 'center', justifyContent: 'center',
  },
  textBlock: {
    paddingHorizontal: 28, alignItems: 'center', gap: 14, paddingBottom: 16,
  },
  tag: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1.5, borderRadius: 100, paddingHorizontal: 16, paddingVertical: 7,
  },
  tagText: { fontSize: 14, fontWeight: '700' },
  heading: { fontSize: 30, fontWeight: '800', textAlign: 'center', lineHeight: 36 },
  body: { fontSize: 18, lineHeight: 30, textAlign: 'center' },
  bottom: { paddingHorizontal: 28, paddingBottom: 24, gap: 16 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 4 },
  dot: { height: 10, borderRadius: 5 },
  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    flexWrap: 'wrap',
    minHeight: 64, borderRadius: 18,
    paddingHorizontal: 24, paddingVertical: 16,
    shadowColor: '#7c5ce8',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45, shadowRadius: 16, elevation: 8,
  },
  ctaText: { color: '#fff', fontSize: 20, fontWeight: '800', letterSpacing: 0.3, flexShrink: 1 },
});
