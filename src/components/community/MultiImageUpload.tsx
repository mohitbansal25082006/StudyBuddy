// F:\StudyBuddy\src\components\community\MultiImageUpload.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

interface MultiImageUploadProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
}

export const MultiImageUpload: React.FC<MultiImageUploadProps> = ({
  images,
  onChange,
  maxImages = 5,
}) => {
  const handleSelectImage = async () => {
    if (images.length >= maxImages) {
      Alert.alert('Limit Reached', `You can only add up to ${maxImages} images.`);
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0].uri) {
        onChange([...images, result.assets[0].uri]);
      }
    } catch (error) {
      console.error('Error selecting image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const handleRemoveImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    onChange(newImages);
  };

  const handleMoveImage = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= images.length) return;
    
    const newImages = [...images];
    const [movedImage] = newImages.splice(fromIndex, 1);
    newImages.splice(toIndex, 0, movedImage);
    onChange(newImages);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Images ({images.length}/{maxImages})</Text>
      
      {images.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.imagesContainer}>
            {images.map((image, index) => (
              <View key={index} style={styles.imageItem}>
                <Image source={{ uri: image }} style={styles.image} />
                
                <View style={styles.imageActions}>
                  <TouchableOpacity
                    style={styles.imageActionButton}
                    onPress={() => handleMoveImage(index, index - 1)}
                    disabled={index === 0}
                  >
                    <Ionicons 
                      name="chevron-back" 
                      size={16} 
                      color={index === 0 ? "#D1D5DB" : "#FFFFFF"} 
                    />
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.imageActionButton}
                    onPress={() => handleMoveImage(index, index + 1)}
                    disabled={index === images.length - 1}
                  >
                    <Ionicons 
                      name="chevron-forward" 
                      size={16} 
                      color={index === images.length - 1 ? "#D1D5DB" : "#FFFFFF"} 
                    />
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.imageActionButton}
                    onPress={() => handleRemoveImage(index)}
                  >
                    <Ionicons name="trash" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
      
      {images.length < maxImages && (
        <TouchableOpacity
          onPress={handleSelectImage}
          style={styles.addImageButton}
        >
          <Ionicons name="image" size={24} color="#9CA3AF" />
          <Text style={styles.addImageText}>Add Image</Text>
        </TouchableOpacity>
      )}
      
      <Text style={styles.helpText}>
        Tap and hold to reorder images. You can add up to {maxImages} images.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  imagesContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  imageItem: {
    width: 100,
    height: 100,
    marginRight: 8,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  imageActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  imageActionButton: {
    padding: 2,
  },
  addImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
  },
  addImageText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#9CA3AF',
    marginLeft: 8,
  },
  helpText: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
});