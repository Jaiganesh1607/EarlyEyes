import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type DisclaimerBannerProps = {
  text?: string;
};

export default function DisclaimerBanner({
  text = 'This is not a diagnosis. Only a doctor can confirm.',
}: DisclaimerBannerProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#FFCC80',
  },
  text: {
    color: '#5D4037',
    fontSize: 13,
  },
});
