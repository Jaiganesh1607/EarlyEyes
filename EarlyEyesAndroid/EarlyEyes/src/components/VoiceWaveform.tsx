import React from 'react';
import { StyleSheet, View } from 'react-native';

type VoiceWaveformProps = {
  isActive?: boolean;
};

export default function VoiceWaveform({ isActive = false }: VoiceWaveformProps) {
  return (
    <View style={styles.container}>
      {[0, 1, 2, 3, 4].map((index) => (
        <View
          key={index}
          style={[
            styles.bar,
            isActive ? styles.activeBar : styles.inactiveBar,
            { height: 12 + index * 6 },
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
    marginVertical: 16,
  },
  bar: {
    width: 8,
    borderRadius: 4,
  },
  activeBar: {
    backgroundColor: '#E53935',
  },
  inactiveBar: {
    backgroundColor: '#B0BEC5',
  },
});
