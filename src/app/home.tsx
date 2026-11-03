import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../context/ThemeContext';

export default function Home() {
  const { theme, fs } = useAppTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar style={theme.statusBar} />

      <View style={[styles.glow, { backgroundColor: theme.accentDim }]} pointerEvents="none" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: theme.textMuted, fontSize: fs.sm }]}>
            Olá, bem-vindo(a) ao
          </Text>
          <Text style={[styles.title, { color: theme.text, fontSize: fs.xxl }]}>Íris</Text>
        </View>
      </View>

      {/* Buttons */}
      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [
            styles.mainBtn,
            { backgroundColor: theme.accentStrong, minHeight: fs.touchTarget + 56 },
            pressed && { opacity: 0.85 },
          ]}
          onPress={() => router.push('/camera')}
          accessibilityRole="button"
          accessibilityLabel="Iniciar navegação com detecção de obstáculos em tempo real"
        >
          <View style={styles.mainBtnIcon}>
            <Ionicons name="navigate-outline" size={36} color="#fff" />
          </View>
          <View>
            <Text style={[styles.mainBtnTitle, { fontSize: fs.xl }]}>Iniciar Navegação</Text>
            <Text style={[styles.mainBtnSub, { fontSize: fs.sm }]}>Detecção de obstáculos ao vivo</Text>
          </View>
        </Pressable>

        <View style={styles.secondaryRow}>
          <Pressable
            style={({ pressed }) => [
              styles.secondaryBtn,
              { backgroundColor: theme.accentDim, borderColor: theme.accentBorder, minHeight: fs.touchTarget + 32 },
              pressed && { opacity: 0.75 },
            ]}
            onPress={() => router.push('/settings')}
            accessibilityRole="button"
            accessibilityLabel="Abrir configurações de acessibilidade"
          >
            <Ionicons name="settings-outline" size={28} color={theme.accent} />
            <Text style={[styles.secondaryLabel, { color: theme.text, fontSize: fs.md }]}>Configurações</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.helpBtn,
              { backgroundColor: theme.infoDim, borderColor: theme.infoBorder, minHeight: fs.touchTarget + 32 },
              pressed && { opacity: 0.75 },
            ]}
            onPress={() => router.push('/help')}
            accessibilityRole="button"
            accessibilityLabel="Abrir ajuda e tutorial"
          >
            <Ionicons name="help-circle-outline" size={28} color={theme.info} />
            <Text style={[styles.secondaryLabel, { color: theme.text, fontSize: fs.md }]}>Ajuda</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  glow: {
    position: 'absolute', top: '40%', alignSelf: 'center',
    width: 360, height: 360, borderRadius: 180,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 28, paddingTop: 56, marginBottom: 20,
  },
  greeting: { fontWeight: '500', marginBottom: 4 },
  title: { fontWeight: '800', lineHeight: undefined },
  logoBox: {
    width: 52, height: 52, borderRadius: 16,
    borderWidth: 2, alignItems: 'center', justifyContent: 'center',
  },
  statusCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    marginHorizontal: 28, borderWidth: 2, borderRadius: 18,
    padding: 14, marginBottom: 24,
  },
  statusDot: { width: 14, height: 14, borderRadius: 7 },
  statusTitle: { fontWeight: '700' },
  statusSub: {},
  actions: { flex: 1, paddingHorizontal: 28, gap: 14 },
  mainBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 20,
    borderRadius: 28, paddingHorizontal: 28,
    shadowColor: '#7c5ce8', shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.55, shadowRadius: 24, elevation: 12,
  },
  mainBtnIcon: {
    width: 68, height: 68, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  mainBtnTitle: { color: '#fff', fontWeight: '800', marginBottom: 4 },
  mainBtnSub: { color: 'rgba(255,255,255,0.9)', fontWeight: '500' },
  secondaryRow: { flexDirection: 'row', gap: 14 },
  secondaryBtn: {
    flex: 1, borderRadius: 22, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  helpBtn: {
    flex: 1, borderRadius: 22, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  secondaryLabel: { fontWeight: '700' },
});
