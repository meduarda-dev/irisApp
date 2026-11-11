import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../context/ThemeContext';

const FAQS = [
  {
    q: 'Como funciona a detecção de objetos?',
    a: 'O Íris usa a câmera do celular junto com IA para identificar objetos em tempo real. Cada objeto detectado tem seu nome falado em voz alta automaticamente.',
  },
  {
    q: 'O aplicativo funciona sem internet?',
    a: 'Sim! O modelo de IA roda completamente offline no seu dispositivo. Nenhuma conexão de dados é necessária para usar a detecção de obstáculos.',
  },
  {
    q: 'Como ajustar a velocidade da voz?',
    a: 'Acesse Configurações → Voz e Áudio → Velocidade da fala. Escolha entre Lenta, Normal, Rápida ou Veloz.',
  },
  {
    q: 'A câmera não detectou um objeto. O que fazer?',
    a: 'Tente manter o celular firme e aponte para o objeto por 1–2 segundos. Certifique-se de que há boa iluminação no ambiente.',
  },
  {
    q: 'Compatível com TalkBack?',
    a: 'Sim, totalmente. O Íris foi projetado para funcionar com o TalkBack do Android. Todos os botões possuem rótulos em português.',
  },
];

const STEPS = [
  { n: 1, title: 'Abra o aplicativo', desc: 'O Íris iniciará automaticamente no modo pronto.' },
  { n: 2, title: "Toque em 'Iniciar Navegação'", desc: 'O grande botão roxo na tela inicial.' },
  { n: 3, title: 'Aponte a câmera', desc: 'Dirija o celular para a direção que deseja explorar.' },
  { n: 4, title: 'Ouça os alertas', desc: 'O Íris falará o nome de cada objeto detectado ao redor.' },
  { n: 5, title: 'Para parar', desc: 'Toque no botão vermelho na parte inferior da tela de navegação.' },
];

type Tab = 'tutorial' | 'faq' | 'contact';

const TABS: { id: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'tutorial', label: 'Tutorial', icon: 'book-outline' },
  { id: 'faq', label: 'Dúvidas', icon: 'chatbubble-outline' },
  { id: 'contact', label: 'Suporte', icon: 'call-outline' },
];

export default function Help() {
  const { theme, fs } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('tutorial');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

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
        <Text style={[styles.title, { color: theme.text, fontSize: fs.xxl }]}>Ajuda</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs} accessibilityRole="tablist">
        {TABS.map(({ id, label, icon }) => {
          const active = tab === id;
          return (
            <Pressable
              key={id}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => setTab(id)}
              style={[
                styles.tab,
                { minHeight: fs.touchTarget },
                active
                  ? { backgroundColor: theme.accentStrong, borderColor: theme.accent }
                  : { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
              ]}
            >
              <Ionicons name={icon} size={16} color={active ? '#fff' : theme.textMuted} />
              <Text style={[styles.tabText, { color: active ? '#fff' : theme.textMuted, fontSize: fs.sm, fontWeight: active ? '800' : '600' }]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 60) }]}>

        {/* Tutorial */}
        {tab === 'tutorial' && (
          <View accessibilityLabel="Tutorial de uso">
            <Text style={[styles.introText, { color: theme.textMuted, fontSize: fs.md, lineHeight: fs.md * fs.lineHeightRatio }]}>
              Siga os passos abaixo para começar a usar o Íris:
            </Text>
            {STEPS.map(s => (
              <View key={s.n} style={[styles.stepCard, { backgroundColor: theme.accentDim, borderColor: theme.accentBorder }]}>
                <View style={[styles.stepNum, { backgroundColor: theme.accentStrong, width: fs.touchTarget, height: fs.touchTarget, borderRadius: fs.touchTarget / 4 }]}>
                  <Text style={[styles.stepNumText, { fontSize: fs.lg }]}>{s.n}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.stepTitle, { color: theme.text, fontSize: fs.lg }]}>{s.title}</Text>
                  <Text style={[styles.stepDesc, { color: theme.textMuted, fontSize: fs.sm, lineHeight: fs.sm * fs.lineHeightRatio }]}>{s.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* FAQ */}
        {tab === 'faq' && (
          <View accessibilityLabel="Perguntas frequentes">
            {FAQS.map((faq, i) => {
              const open = openFaq === i;
              return (
                <View
                  key={i}
                  style={[
                    styles.faqItem,
                    open
                      ? { borderColor: theme.accentBorder, backgroundColor: theme.accentDim }
                      : { borderColor: theme.border, backgroundColor: theme.surface },
                  ]}
                >
                  <Pressable
                    onPress={() => setOpenFaq(open ? null : i)}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: open }}
                    style={[styles.faqQuestion, { minHeight: fs.touchTarget }]}
                  >
                    <Text style={[styles.faqQuestionText, { color: theme.text, fontSize: fs.md, lineHeight: fs.md * 1.4 }]}>{faq.q}</Text>
                    <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={22} color={open ? theme.accent : theme.textSubtle} />
                  </Pressable>
                  {open && (
                    <Text style={[styles.faqAnswer, { color: theme.textMuted, fontSize: fs.md, lineHeight: fs.md * fs.lineHeightRatio }]}>{faq.a}</Text>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Contact */}
        {tab === 'contact' && (
          <View style={{ gap: 14 }} accessibilityLabel="Contato e suporte">
            <View style={[styles.contactCard, { backgroundColor: theme.accentDim, borderColor: theme.accentBorder }]}>
              <View style={[styles.contactIcon, { backgroundColor: theme.accentDim, borderColor: theme.accentBorder }]}>
                <Ionicons name="mail" size={28} color={theme.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.contactTitle, { color: theme.text, fontSize: fs.lg }]}>Email para Suporte</Text>
                <Text style={[styles.contactDesc, { color: theme.textMuted, fontSize: fs.sm, lineHeight: fs.sm * fs.lineHeightRatio }]}>
                  rochaeduarda98133@gmail.com
                </Text>
              </View>
            </View>
          </View>
        )}

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
  backBtn: { borderRadius: 16, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  title: { fontWeight: '800' },
  tabs: { flexDirection: 'row', gap: 10, paddingHorizontal: 28, paddingTop: 20 },
  tab: {
    flex: 1, borderRadius: 14, borderWidth: 2,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
  },
  tabText: {},
  scrollContent: { padding: 28, paddingTop: 20, gap: 10 },
  introText: { marginBottom: 24 },
  stepCard: {
    flexDirection: 'row', gap: 16, padding: 18, borderRadius: 20,
    borderWidth: 1.5, marginBottom: 12, alignItems: 'center',
  },
  stepNum: { flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { color: '#fff', fontWeight: '800' },
  stepTitle: { fontWeight: '700', marginBottom: 5 },
  stepDesc: {},
  faqItem: { borderRadius: 18, borderWidth: 2, overflow: 'hidden', marginBottom: 10 },
  faqQuestion: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 18, gap: 12,
  },
  faqQuestionText: { fontWeight: '700', flex: 1 },
  faqAnswer: { padding: 18, paddingTop: 0 },
  contactCard: { flexDirection: 'row', gap: 14, padding: 22, borderRadius: 22, borderWidth: 2 },
  contactIcon: {
    width: 56, height: 56, borderRadius: 16, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  contactTitle: { fontWeight: '800', marginBottom: 4 },
  contactDesc: {},
  contactPhone: { fontWeight: '700', marginBottom: 4 },
  chatBtn: {
    marginTop: 16, paddingHorizontal: 24,
    borderRadius: 14, alignSelf: 'flex-start',
    alignItems: 'center', justifyContent: 'center',
  },
  chatBtnText: { color: '#fff', fontWeight: '800' },
  emailNote: { borderWidth: 1.5, borderRadius: 16, padding: 16 },
  emailText: {},
});
