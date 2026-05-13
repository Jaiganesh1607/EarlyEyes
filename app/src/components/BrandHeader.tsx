import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

type BrandHeaderProps = {
  layout?: 'row' | 'stack';
  title?: string;
  subtitle?: string;
  size?: number;
};

const LOGO_SOURCE = require('../../assets/images/earlyeyes-logo.png');

export default function BrandHeader({
  layout = 'row',
  title = 'EarlyEyes',
  subtitle,
  size = 28,
}: BrandHeaderProps) {
  return (
    <View style={[styles.base, layout === 'stack' ? styles.stack : styles.row]}>
      <Image
        source={LOGO_SOURCE}
        style={[styles.logo, { width: size, height: size }]}
        resizeMode="contain"
      />
      <View style={layout === 'stack' ? styles.stackText : styles.rowText}>
        <Text style={[styles.title, layout === 'stack' && styles.titleStack]}>
          {title}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  stack: {
    flexDirection: 'column',
    gap: 8,
  },
  logo: {
    borderRadius: 10,
  },
  rowText: {
    justifyContent: 'center',
  },
  stackText: {
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0E5FB3',
  },
  titleStack: {
    fontSize: 26,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4B5563',
    textAlign: 'center',
  },
});
