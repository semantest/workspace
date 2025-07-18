import React, { useEffect } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

export function SplashScreen() {
  const { theme } = useTheme();
  const fadeAnim = new Animated.Value(0);
  const scaleAnim = new Animated.Value(0.8);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.primary }]}>
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={styles.logo}>
          <Animated.Text style={[styles.logoText, { color: theme.colors.surface }]}>
            S
          </Animated.Text>
        </View>
        <Animated.Text style={[styles.appName, { color: theme.colors.surface }]}>
          Semantest
        </Animated.Text>
        <Animated.Text style={[styles.tagline, { color: theme.colors.surface, opacity: 0.8 }]}>
          Semantic Testing Platform
        </Animated.Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  logoText: {
    fontSize: 48,
    fontWeight: '700',
  },
  appName: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    fontWeight: '500',
  },
});