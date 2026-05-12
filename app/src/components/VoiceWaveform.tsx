import React from 'react';
import { StyleSheet, View } from 'react-native';

type VoiceWaveformProps = {
  isActive?: boolean;
};

export default function VoiceWaveform({ isActive = false }: VoiceWaveformProps) {
  const bars = [16, 24, 36, 52, 68, 52, 36, 24, 16];
  return (
    <View style={styles.container}>
      {bars.map((height, index) => (
        <View
          key={index}
          style={[
            styles.bar,
            isActive ? styles.activeBar : styles.inactiveBar,
            { height },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 6,
    marginVertical: 12,
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
