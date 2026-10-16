import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { colors } from './theme/colors';

const BAR_W = 96;
const STAGE_W = 280;

// Brilho radial "falso": círculos translúcidos empilhados
function Glow() {
  const sizes = [340, 300, 260, 220, 180, 140];
  return (
    <>
      {sizes.map((s) => (
        <View
          key={s}
          style={{
            position: 'absolute',
            width: s,
            height: s,
            borderRadius: s / 2,
            left: STAGE_W / 2 - s / 2,
            top: 175 - s / 2,
            backgroundColor: colors.accent,
            opacity: 0.045,
          }}
        />
      ))}
    </>
  );
}

export default function Splash() {
  const [enter] = useState(() => new Animated.Value(0));
  const [pulse] = useState(() => new Animated.Value(0));
  const [bar] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();

    Animated.timing(bar, {
      toValue: 1,
      duration: 2600,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) router.replace('/home'); // depois: '/onboarding'
    });

    return () => {
      loop.stop();
      bar.stopAnimation();
    };
  }, [enter, pulse, bar]);

  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });
  const eyeScale = enter.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] });
  const textY = enter.interpolate({ inputRange: [0, 1], outputRange: [12, 0] });
  const barX = bar.interpolate({ inputRange: [0, 1], outputRange: [-BAR_W, 0] });

  return (
    <View
      style={styles.container}
      accessible
      accessibilityLabel="Íris, assistente visual. Carregando."
    >
      <StatusBar style="light" />

      <View style={styles.stage}>
        <Glow />
        <Animated.View
          style={[styles.bigRing, { opacity: ringOpacity, transform: [{ scale: ringScale }] }]}
        />
        <Animated.View
          style={[styles.eyeCircle, { opacity: enter, transform: [{ scale: eyeScale }] }]}
        >
          <Ionicons name="eye-outline" size={56} color="#FFFFFF" />
        </Animated.View>
      </View>

      <Animated.View
        style={{ opacity: enter, transform: [{ translateY: textY }], alignItems: 'center', marginTop: 24 }}
      >
        <Text style={styles.title}>Íris</Text>
        <Text style={styles.subtitle}>ASSISTENTE VISUAL</Text>
      </Animated.View>

      <View style={styles.track}>
        <Animated.View style={[styles.fill, { transform: [{ translateX: barX }] }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 40,
  },
  stage: { width: STAGE_W, height: 290 },
  bigRing: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    left: STAGE_W / 2 - 100,
    top: 30,
    borderWidth: 1,
    borderColor: 'rgba(124,92,255,0.45)',
  },
  eyeCircle: {
    position: 'absolute',
    width: 124,
    height: 124,
    borderRadius: 62,
    left: STAGE_W / 2 - 62,
    top: 166,
    borderWidth: 1,
    borderColor: 'rgba(183,166,255,0.6)',
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: '#FFFFFF', fontSize: 44, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: {
    color: colors.accentSoft,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 3,
    marginTop: 8,
  },
  track: {
    width: BAR_W,
    height: 3,
    borderRadius: 2,
    marginTop: 28,
    overflow: 'hidden',
    backgroundColor: 'rgba(124,92,255,0.2)',
  },
  fill: { width: BAR_W, height: 3, backgroundColor: colors.accent },
});