import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated } from 'react-native';

type VoiceWaveformProps = {
  isActive?: boolean;
};

export default function VoiceWaveform({ isActive = false }: VoiceWaveformProps) {
  const barsCount = 9;
  const baseHeights = [16, 24, 36, 52, 68, 52, 36, 24, 16];
  
  const animatedValues = useRef([...Array(barsCount)].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (isActive) {
      const animations = animatedValues.map((anim) => {
        return Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: 1,
              duration: 250 + Math.random() * 200,
              useNativeDriver: false,
            }),
            Animated.timing(anim, {
              toValue: 0,
              duration: 250 + Math.random() * 200,
              useNativeDriver: false,
            })
          ])
        );
      });

      Animated.stagger(100, animations).start();
    } else {
      animatedValues.forEach(anim => {
        anim.stopAnimation();
        Animated.timing(anim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }).start();
      });
    }
  }, [isActive, animatedValues]);

  return (
    <View style={styles.container}>
      {animatedValues.map((anim, index) => {
        const height = anim.interpolate({
          inputRange: [0, 1],
          outputRange: [baseHeights[index], baseHeights[index] * 1.8],
        });

        return (
          <Animated.View
            key={index}
            style={[
              styles.bar,
              isActive ? styles.activeBar : styles.inactiveBar,
              { height },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center', // Centers the bars vertically so they expand from the middle
    justifyContent: 'center',
    gap: 6,
    marginVertical: 12,
    height: 120, // Prevents layout jumping when bars expand
  },
  bar: {
    width: 8,
    borderRadius: 4,
  },
  activeBar: {
    backgroundColor: '#0E5FB3',
  },
  inactiveBar: {
    backgroundColor: '#9BB7E4',
  },
});
