// F:\StudyBuddy\src\components\community\ImageViewer.tsx
import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
  FlatList,
  Animated,
  Text,
  PanResponder,
  StatusBar,
  Platform,
  Share,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';

const { width, height } = Dimensions.get('window');
const DOUBLE_TAP_DELAY = 300;
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

interface ImageViewerProps {
  visible: boolean;
  images: string[];
  initialIndex: number;
  onClose: () => void;
}

interface ImageState {
  scale: Animated.Value;
  translateX: Animated.Value;
  translateY: Animated.Value;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({
  visible,
  images,
  initialIndex,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(initialIndex);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const lastTap = useRef<number>(0);
  const controlsTimer = useRef<NodeJS.Timeout | null>(null);
  
  // Image transformation states for each image - properly typed initialization
  const imageStates = useRef<{ [key: number]: ImageState }>({});
  
  // Initialize image states on mount
  React.useEffect(() => {
    const states: { [key: number]: ImageState } = {};
    images.forEach((_, index) => {
      states[index] = {
        scale: new Animated.Value(1),
        translateX: new Animated.Value(0),
        translateY: new Animated.Value(0),
      };
    });
    imageStates.current = states;
  }, [images]);

  // Get current image states safely
  const getCurrentImageStates = (): { [key: number]: ImageState } => {
    return imageStates.current || {};
  };

  // Update current index when initialIndex changes
  React.useEffect(() => {
    setCurrentIndex(initialIndex);
    if (flatListRef.current && visible) {
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({ 
          index: initialIndex, 
          animated: false 
        });
      }, 100);
    }
  }, [initialIndex, visible]);

  // Auto-hide controls after 3 seconds
  React.useEffect(() => {
    if (showControls) {
      if (controlsTimer.current) {
        clearTimeout(controlsTimer.current);
      }
      controlsTimer.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
    return () => {
      if (controlsTimer.current) {
        clearTimeout(controlsTimer.current);
      }
    };
  }, [showControls]);

  const toggleControls = useCallback(() => {
    setShowControls(prev => !prev);
  }, []);

  const onViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }, []);

  const viewabilityConfig = React.useMemo(() => ({
    itemVisiblePercentThreshold: 50,
  }), []);

  // Create pan responder for pinch zoom and pan
  const createPanResponder = (index: number) => {
    const state = getCurrentImageStates()[index];
    if (!state) return PanResponder.create({});
    
    let initialDistance = 0;
    let initialScale = 1;
    let lastScale = 1;
    let offsetX = 0;
    let offsetY = 0;

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        // Handle double tap to zoom
        const now = Date.now();
        if (now - lastTap.current < DOUBLE_TAP_DELAY) {
          handleDoubleTap(index);
        }
        lastTap.current = now;

        // Show controls on touch
        setShowControls(true);

        // Store current scale
        state.scale.stopAnimation((value) => {
          lastScale = value;
        });
        state.translateX.stopAnimation((value) => {
          offsetX = value;
        });
        state.translateY.stopAnimation((value) => {
          offsetY = value;
        });

        // Calculate initial distance for pinch zoom
        if (evt.nativeEvent.touches.length === 2) {
          initialDistance = getDistance(
            evt.nativeEvent.touches[0],
            evt.nativeEvent.touches[1]
          );
          initialScale = lastScale;
        }
      },
      onPanResponderMove: (evt, gestureState) => {
        // Pinch zoom
        if (evt.nativeEvent.touches.length === 2) {
          const distance = getDistance(
            evt.nativeEvent.touches[0],
            evt.nativeEvent.touches[1]
          );
          const scale = (distance / initialDistance) * initialScale;
          const clampedScale = Math.min(Math.max(scale, MIN_ZOOM), MAX_ZOOM);
          state.scale.setValue(clampedScale);
        }
        // Pan (only when zoomed in)
        else if (lastScale > 1) {
          const maxTranslateX = (width * lastScale - width) / 2;
          const maxTranslateY = (height * lastScale - height) / 2;

          const newTranslateX = Math.min(
            Math.max(offsetX + gestureState.dx, -maxTranslateX),
            maxTranslateX
          );
          const newTranslateY = Math.min(
            Math.max(offsetY + gestureState.dy, -maxTranslateY),
            maxTranslateY
          );

          state.translateX.setValue(newTranslateX);
          state.translateY.setValue(newTranslateY);
        }
      },
      onPanResponderRelease: () => {
        // Reset zoom if scale is too small
        state.scale.stopAnimation((value) => {
          if (value < 1.2) {
            Animated.parallel([
              Animated.spring(state.scale, {
                toValue: 1,
                useNativeDriver: true,
              }),
              Animated.spring(state.translateX, {
                toValue: 0,
                useNativeDriver: true,
              }),
              Animated.spring(state.translateY, {
                toValue: 0,
                useNativeDriver: true,
              }),
            ]).start();
          }
        });
      },
    });
  };

  const getDistance = (touch1: any, touch2: any) => {
    const dx = touch1.pageX - touch2.pageX;
    const dy = touch1.pageY - touch2.pageY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleDoubleTap = (index: number) => {
    const state = getCurrentImageStates()[index];
    if (!state) return;
    
    state.scale.stopAnimation((currentScale) => {
      const newScale = currentScale > 1 ? 1 : 2;
      Animated.parallel([
        Animated.spring(state.scale, {
          toValue: newScale,
          useNativeDriver: true,
          friction: 7,
        }),
        Animated.spring(state.translateX, {
          toValue: 0,
          useNativeDriver: true,
        }),
        Animated.spring(state.translateY, {
          toValue: 0,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const resetImageState = (index: number) => {
    const state = getCurrentImageStates()[index];
    if (!state) return;
    
    Animated.parallel([
      Animated.spring(state.scale, {
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.spring(state.translateX, {
        toValue: 0,
        useNativeDriver: true,
      }),
      Animated.spring(state.translateY, {
        toValue: 0,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleDownloadImage = async () => {
    try {
      setIsDownloading(true);
      
      // Request permission
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant permission to save images to your device.');
        return;
      }

      const currentImageUri = images[currentIndex];
      const filename = currentImageUri.split('/').pop() || `image_${Date.now()}.jpg`;
      
      // Use documentDirectory for saving
      const docDir = FileSystem.documentDirectory;
      if (!docDir) {
        Alert.alert('Error', 'Unable to access device storage.');
        return;
      }
      
      const fileUri = `${docDir}${filename}`;

      // Download the image
      const downloadResult = await FileSystem.downloadAsync(currentImageUri, fileUri);
      
      // Save to media library
      const asset = await MediaLibrary.createAssetAsync(downloadResult.uri);
      await MediaLibrary.createAlbumAsync('StudyBuddy', asset, false);

      Alert.alert('Success', 'Image saved to gallery!');
    } catch (error) {
      console.error('Error downloading image:', error);
      Alert.alert('Error', 'Failed to save image. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShareImage = async () => {
    try {
      const currentImageUri = images[currentIndex];
      await Share.share({
        url: currentImageUri,
        message: 'Check out this image from StudyBuddy!',
      });
    } catch (error) {
      console.error('Error sharing image:', error);
      Alert.alert('Error', 'Failed to share image. Please try again.');
    }
  };

  const renderItem = ({ item, index }: { item: string; index: number }) => {
    const state = getCurrentImageStates()[index];
    if (!state) return null;
    
    const panResponder = createPanResponder(index);

    return (
      <View style={styles.imageContainer}>
        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.animatedImageContainer,
            {
              transform: [
                { scale: state.scale },
                { translateX: state.translateX },
                { translateY: state.translateY },
              ],
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={toggleControls}
            style={styles.imageTouchable}
          >
            <Image
              source={{ uri: item }}
              style={styles.image}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  };

  const getItemLayout = (_: any, index: number) => ({
    length: width,
    offset: width * index,
    index,
  });

  const handlePrevImage = () => {
    if (currentIndex > 0) {
      resetImageState(currentIndex);
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      flatListRef.current?.scrollToIndex({ index: newIndex, animated: true });
    }
  };

  const handleNextImage = () => {
    if (currentIndex < images.length - 1) {
      resetImageState(currentIndex);
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      flatListRef.current?.scrollToIndex({ index: newIndex, animated: true });
    }
  };

  const handleClose = () => {
    // Reset all image states before closing
    const states = getCurrentImageStates();
    Object.keys(states).forEach((key) => {
      resetImageState(parseInt(key));
    });
    onClose();
  };

  const handleZoomIn = () => {
    const state = getCurrentImageStates()[currentIndex];
    if (!state) return;
    
    state.scale.stopAnimation((currentScale) => {
      const newScale = Math.min(currentScale + 0.5, MAX_ZOOM);
      Animated.spring(state.scale, {
        toValue: newScale,
        useNativeDriver: true,
        friction: 7,
      }).start();
    });
  };

  const handleZoomOut = () => {
    const state = getCurrentImageStates()[currentIndex];
    if (!state) return;
    
    state.scale.stopAnimation((currentScale) => {
      const newScale = Math.max(currentScale - 0.5, MIN_ZOOM);
      const animations = [
        Animated.spring(state.scale, {
          toValue: newScale,
          useNativeDriver: true,
          friction: 7,
        }),
      ];
      
      if (newScale === 1) {
        animations.push(
          Animated.spring(state.translateX, {
            toValue: 0,
            useNativeDriver: true,
          }),
          Animated.spring(state.translateY, {
            toValue: 0,
            useNativeDriver: true,
          })
        );
      }
      
      Animated.parallel(animations).start();
    });
  };

  const handleResetZoom = () => {
    resetImageState(currentIndex);
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <StatusBar hidden={!showControls} />
      <View style={styles.container}>
        {/* Header */}
        {showControls && (
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            
            <Text style={styles.imageCounter}>
              {currentIndex + 1} / {images.length}
            </Text>

            <View style={styles.headerActions}>
              <TouchableOpacity
                onPress={handleShareImage}
                style={styles.actionButton}
              >
                <Ionicons name="share-outline" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={handleDownloadImage}
                style={styles.actionButton}
                disabled={isDownloading}
              >
                <Ionicons
                  name={isDownloading ? "hourglass-outline" : "download-outline"}
                  size={24}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Image Gallery */}
        <View style={styles.galleryContainer}>
          <FlatList
            ref={flatListRef}
            data={images}
            renderItem={renderItem}
            keyExtractor={(_, index) => index.toString()}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEnabled={true}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: scrollX } } }],
              { useNativeDriver: false }
            )}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            getItemLayout={getItemLayout}
            initialScrollIndex={initialIndex}
            onScrollBeginDrag={() => setShowControls(true)}
          />
        </View>

        {/* Zoom Controls */}
        {showControls && (
          <View style={styles.zoomControls}>
            <TouchableOpacity
              style={styles.zoomButton}
              onPress={handleZoomOut}
            >
              <Ionicons name="remove" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.zoomButton}
              onPress={handleResetZoom}
            >
              <Ionicons name="scan-outline" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.zoomButton}
              onPress={handleZoomIn}
            >
              <Ionicons name="add" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}

        {/* Navigation Buttons */}
        {showControls && images.length > 1 && (
          <>
            {currentIndex > 0 && (
              <TouchableOpacity
                style={styles.navButtonLeft}
                onPress={handlePrevImage}
              >
                <Ionicons name="chevron-back" size={32} color="#FFFFFF" />
              </TouchableOpacity>
            )}
            
            {currentIndex < images.length - 1 && (
              <TouchableOpacity
                style={styles.navButtonRight}
                onPress={handleNextImage}
              >
                <Ionicons name="chevron-forward" size={32} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </>
        )}

        {/* Image Indicators */}
        {showControls && images.length > 1 && images.length <= 10 && (
          <View style={styles.indicatorContainer}>
            {images.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.indicator,
                  index === currentIndex ? styles.activeIndicator : undefined,
                ]}
              />
            ))}
          </View>
        )}

        {/* Gesture Hint */}
        {showControls && (
          <View style={styles.hintContainer}>
            <Text style={styles.hintText}>
              Double tap or pinch to zoom • Drag to pan
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  closeButton: {
    padding: 8,
  },
  imageCounter: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  galleryContainer: {
    flex: 1,
  },
  imageContainer: {
    width,
    height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  animatedImageContainer: {
    width,
    height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageTouchable: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: width,
    height: height * 0.8,
  },
  zoomControls: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 25,
    padding: 8,
    zIndex: 10,
  },
  zoomButton: {
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonLeft: {
    position: 'absolute',
    left: 20,
    top: '50%',
    transform: [{ translateY: -25 }],
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  navButtonRight: {
    position: 'absolute',
    right: 20,
    top: '50%',
    transform: [{ translateY: -25 }],
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginHorizontal: 4,
  },
  activeIndicator: {
    backgroundColor: '#FFFFFF',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  hintContainer: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  hintText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    fontWeight: '500',
  },
});