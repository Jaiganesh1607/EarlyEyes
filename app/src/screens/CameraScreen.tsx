import React, { useCallback, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { launchImageLibrary } from 'react-native-image-picker';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  usePhotoOutput,
} from 'react-native-vision-camera';
import { RootStackParamList } from '../navigation/AppNavigator';

export default function CameraScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [cameraPosition, setCameraPosition] = useState<'back' | 'front'>('back');
  const device = useCameraDevice(cameraPosition);
  const { hasPermission, requestPermission } = useCameraPermission();
  const [isCapturing, setIsCapturing] = useState(false);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const photoOutput = usePhotoOutput();

  React.useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  const handleCapture = useCallback(async () => {
    if (!photoOutput || isCapturing) {
      return;
    }
    try {
      setIsCapturing(true);
      const photo = await photoOutput.capturePhoto(
        { flashMode: isFlashOn ? 'on' : 'off' },
        {},
      );
      const filePath = await photo.saveToTemporaryFileAsync();
      photo.dispose();
      navigation.navigate('InputMethod', { photoUri: `file://${filePath}` });
    } finally {
      setIsCapturing(false);
    }
  }, [isCapturing, isFlashOn, navigation, photoOutput]);

  const handleToggleFlash = useCallback(() => {
    setIsFlashOn((prev) => !prev);
  }, []);

  const handleRotateCamera = useCallback(() => {
    setCameraPosition((prev) => (prev === 'back' ? 'front' : 'back'));
  }, []);

  const handleOpenGallery = useCallback(async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: 1,
    });

    const asset = result.assets?.[0];
    if (asset?.uri) {
      navigation.navigate('InputMethod', { photoUri: asset.uri });
    }
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.preview}>
        {device && hasPermission ? (
          <Camera
            style={StyleSheet.absoluteFill}
            device={device}
            isActive
            outputs={[photoOutput]}
          />
        ) : (
          <View style={styles.previewFallback}>
            <Text style={styles.previewText}>Camera unavailable</Text>
          </View>
        )}

        <View style={styles.topControls}>
          <Pressable
            style={styles.topButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="close" size={22} color="#FFFFFF" />
          </Pressable>
          <Pressable style={styles.topButton} onPress={handleToggleFlash}>
            <Icon
              name={isFlashOn ? 'flash' : 'flash-off'}
              size={20}
              color="#FFFFFF"
            />
          </Pressable>
        </View>

        <View style={styles.guideCard}>
          <View style={styles.guideHeader}>
            <Icon name="information" size={18} color="#A7C7FF" />
            <Text style={styles.guideTitle}>Position Subject</Text>
          </View>
          <Text style={styles.guideText}>
            Take a clear photo of your child's full body. Ensure good lighting.
          </Text>
        </View>

        <View style={styles.guideFrame} />

        <View style={styles.bottomControls}>
          <Pressable style={styles.bottomButton} onPress={handleRotateCamera}>
            <Icon name="camera-rotate" size={22} color="#FFFFFF" />
          </Pressable>
          <Pressable
            style={[styles.captureButton, isCapturing && styles.captureDisabled]}
            onPress={handleCapture}
          />
          <Pressable style={styles.bottomButton} onPress={handleOpenGallery}>
            <Icon name="image" size={22} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  preview: {
    flex: 1,
    borderRadius: 24,
    margin: 16,
    overflow: 'hidden',
  },
  previewFallback: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#1F2933',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewText: {
    color: '#E5E7EB',
  },
  topControls: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  topButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideCard: {
    position: 'absolute',
    top: 88,
    left: 24,
    right: 24,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 18,
    backgroundColor: 'rgba(36,40,44,0.85)',
  },
  guideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  guideTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  guideText: {
    color: '#D1D5DB',
    fontSize: 14,
    lineHeight: 20,
  },
  guideFrame: {
    position: 'absolute',
    left: 28,
    right: 28,
    top: 210,
    bottom: 140,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    borderStyle: 'dashed',
  },
  bottomControls: {
    position: 'absolute',
    left: 28,
    right: 28,
    bottom: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bottomButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButton: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 5,
    borderColor: '#FFFFFF',
    backgroundColor: '#FFFFFF',
  },
  captureDisabled: {
    opacity: 0.6,
  },
});
