import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from './theme/colors';

type CardProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
};

function Card({ icon, label, onPress }: CardProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={32} color={colors.accentSoft} />
      <Text style={styles.cardLabel}>{label}</Text>
    </Pressable>
  );
}

export default function Home() {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <Ionicons name="eye-outline" size={36} color={colors.accent} />
        <Text style={styles.title}>Íris</Text>
        <Text style={styles.subtitle}>O que deseja fazer?</Text>
      </View>

      <View style={styles.grid}>
        <Card
          icon="camera-outline"
          label="Identificar objeto"
          onPress={() => router.push('/camera')}
        />
        {/* <Card
          icon="information-circle-outline"
          label="Sobre"
          onPress={() => router.push('/about')}
        /> */}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: 24,
    paddingTop: 80,
  },
  header: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 48,
  },
  title: {
    color: colors.text,
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 16,
    fontWeight: '500',
  },
  grid: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'center',
  },
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingVertical: 32,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(124,92,255,0.2)',
  },
  cardPressed: {
    opacity: 0.7,
    backgroundColor: colors.primary,
  },
  cardLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
