// F:\StudyBuddy\src\components\community\ReplyItem.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CommentReply } from '../../types';
import { formatDistanceToNow } from 'date-fns';

interface ReplyItemProps {
  reply: CommentReply;
  onLike: () => void;
  onDelete: () => void;
  isAuthor: boolean;
}

// Helper function to generate avatar URL from user info
const getAvatarUrl = (userAvatar?: string | null, userName?: string | null, userId?: string | null): string => {
  if (userAvatar) {
    return userAvatar;
  }
  
  // Use DiceBear Avatars API - free avatar generation service
  // Using 'initials' style as fallback
  const seed = userId || userName || 'default';
  return `https://api.dicebear.com/7.x/initials/png?seed=${encodeURIComponent(seed)}&backgroundColor=6366F1&textColor=ffffff`;
};

export const ReplyItem: React.FC<ReplyItemProps> = ({
  reply,
  onLike,
  onDelete,
  isAuthor,
}) => {
  const [showOptions, setShowOptions] = useState(false);

  const handleDeleteReply = () => {
    Alert.alert(
      'Delete Reply',
      'Are you sure you want to delete this reply?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', onPress: onDelete, style: 'destructive' },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.authorInfo}>
          <Image
            source={{ uri: getAvatarUrl(reply.user_avatar, reply.user_name, reply.user_id) }}
            style={styles.authorAvatar}
          />
          <View style={styles.authorDetails}>
            <Text style={styles.authorName}>{reply.user_name}</Text>
            <Text style={styles.replyDate}>
              {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
            </Text>
          </View>
        </View>
        
        {isAuthor && (
          <TouchableOpacity
            onPress={() => setShowOptions(!showOptions)}
            style={styles.optionsButton}
          >
            <Ionicons name="ellipsis-vertical" size={16} color="#6B7280" />
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.content}>{reply.content}</Text>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.action} onPress={onLike}>
          <Ionicons
            name={reply.liked_by_user ? "heart" : "heart-outline"}
            size={16}
            color={reply.liked_by_user ? "#EF4444" : "#6B7280"}
          />
          <Text style={styles.actionText}>{reply.likes}</Text>
        </TouchableOpacity>
      </View>

      {showOptions && isAuthor && (
        <View style={styles.optionsContainer}>
          <TouchableOpacity
            onPress={handleDeleteReply}
            style={styles.deleteButton}
          >
            <Ionicons name="trash-outline" size={16} color="#EF4444" />
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    marginLeft: 20,
    borderLeftWidth: 2,
    borderLeftColor: '#E5E7EB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
    backgroundColor: '#F3F4F6',
  },
  authorDetails: {
    flex: 1,
  },
  authorName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
  replyDate: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 1,
  },
  optionsButton: {
    padding: 4,
  },
  content: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 6,
  },
  actions: {
    flexDirection: 'row',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginLeft: 4,
  },
  optionsContainer: {
    position: 'absolute',
    right: 16,
    top: 30,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#EF4444',
    marginLeft: 8,
  },
});