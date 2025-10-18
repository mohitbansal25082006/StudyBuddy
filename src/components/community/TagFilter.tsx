// F:\StudyBuddy\src\components\community\TagFilter.tsx
import React from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Text,
  StyleSheet,
} from 'react-native';

interface TagFilterProps {
  selectedTags: string[];
  onTagPress: (tag: string) => void;
}

export const TagFilter: React.FC<TagFilterProps> = ({
  selectedTags,
  onTagPress,
}) => {
  const commonTags = [
    'Math', 'Physics', 'Chemistry', 'Biology', 'History',
    'English', 'Computer Science', 'Economics', 'Psychology',
    'Study Tips', 'Exam Prep', 'Resources', 'Motivation'
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {commonTags.map((tag) => {
          const isSelected = selectedTags.includes(tag);
          return (
            <TouchableOpacity
              key={tag}
              onPress={() => onTagPress(tag)}
              style={[
                styles.tag,
                isSelected ? styles.selectedTag : styles.unselectedTag
              ]}
            >
              <Text
                style={[
                  styles.tagText,
                  isSelected ? styles.selectedTagText : styles.unselectedTagText
                ]}
              >
                {tag}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  scrollContent: {
    paddingRight: 16,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  selectedTag: {
    backgroundColor: '#6366F1',
  },
  unselectedTag: {
    backgroundColor: '#F3F4F6',
  },
  tagText: {
    fontSize: 14,
    fontWeight: '500',
  },
  selectedTagText: {
    color: '#FFFFFF',
  },
  unselectedTagText: {
    color: '#374151',
  },
});