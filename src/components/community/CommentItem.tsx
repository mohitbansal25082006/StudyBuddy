// F:\StudyBuddy\src\components\community\CommentItem.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Comment, CommentReply } from '../../types';
import { formatDistanceToNow } from 'date-fns';
import { ReplyItem } from './ReplyItem';

interface CommentItemProps {
  comment: Comment;
  onLike: () => void;
  onDelete: () => void;
  onReply: (content: string) => void;
  onReplyLike: (replyId: string) => void;
  onReplyDelete: (replyId: string) => void;
  isAuthor: boolean;
  userId: string;
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

export const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  onLike,
  onDelete,
  onReply,
  onReplyLike,
  onReplyDelete,
  isAuthor,
  userId,
}) => {
  const [showOptions, setShowOptions] = useState(false);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showReplies, setShowReplies] = useState(false);

  const handleDeleteComment = () => {
    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', onPress: onDelete, style: 'destructive' },
      ]
    );
  };

  const handleSubmitReply = () => {
    if (replyText.trim()) {
      onReply(replyText.trim());
      setReplyText('');
      setShowReplyInput(false);
      setShowReplies(true);
    }
  };

  const handleReportComment = () => {
    // This would open the report modal
    // For now, we'll just show an alert
    Alert.alert(
      'Report Comment',
      'Are you sure you want to report this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Report', onPress: () => {
          // Handle report submission
          Alert.alert('Report Submitted', 'Thank you for your report. We will review it shortly.');
        }, style: 'destructive' },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.authorInfo}>
          <Image
            source={{ uri: getAvatarUrl(comment.user_avatar, comment.user_name, comment.user_id) }}
            style={styles.authorAvatar}
          />
          <View style={styles.authorDetails}>
            <Text style={styles.authorName}>{comment.user_name}</Text>
            <Text style={styles.commentDate}>
              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
            </Text>
          </View>
        </View>
       
        <TouchableOpacity
          onPress={() => setShowOptions(!showOptions)}
          style={styles.optionsButton}
        >
          <Ionicons name="ellipsis-vertical" size={16} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <Text style={styles.content}>{comment.content}</Text>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.action} onPress={onLike}>
          <Ionicons
            name={comment.liked_by_user ? "heart" : "heart-outline"}
            size={16}
            color={comment.liked_by_user ? "#EF4444" : "#6B7280"}
          />
          <Text style={styles.actionText}>{comment.likes}</Text>
        </TouchableOpacity>
       
        <TouchableOpacity
          style={styles.action}
          onPress={() => setShowReplyInput(!showReplyInput)}
        >
          <Ionicons name="arrow-undo" size={16} color="#6B7280" />
          <Text style={styles.actionText}>Reply</Text>
        </TouchableOpacity>
       
        {comment.replies && comment.replies.length > 0 && (
          <TouchableOpacity
            style={styles.action}
            onPress={() => setShowReplies(!showReplies)}
          >
            <Ionicons
              name={showReplies ? "chevron-up" : "chevron-down"}
              size={16}
              color="#6B7280"
            />
            <Text style={styles.actionText}>
              {showReplies ? 'Hide' : 'View'} {comment.replies.length} {comment.replies.length === 1 ? 'Reply' : 'Replies'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Reply Input */}
      {showReplyInput && (
        <View style={styles.replyInputContainer}>
          <TextInput
            value={replyText}
            onChangeText={setReplyText}
            placeholder="Write a reply..."
            multiline
            style={styles.replyInput}
          />
          <TouchableOpacity
            onPress={handleSubmitReply}
            style={styles.submitReplyButton}
            disabled={!replyText.trim()}
          >
            <Ionicons
              name="send"
              size={16}
              color={replyText.trim() ? "#6366F1" : "#D1D5DB"}
            />
          </TouchableOpacity>
        </View>
      )}

      {/* Replies */}
      {showReplies && comment.replies && comment.replies.length > 0 && (
        <View style={styles.repliesContainer}>
          {comment.replies.map((reply) => (
            <ReplyItem
              key={reply.id}
              reply={reply}
              onLike={() => onReplyLike(reply.id)}
              onDelete={() => onReplyDelete(reply.id)}
              isAuthor={reply.user_id === userId}
            />
          ))}
        </View>
      )}

      {/* Options Menu */}
      {showOptions && (
        <View style={styles.optionsContainer}>
          {isAuthor && (
            <TouchableOpacity
              onPress={handleDeleteComment}
              style={styles.optionButton}
            >
              <Ionicons name="trash-outline" size={16} color="#EF4444" />
              <Text style={[styles.optionText, { color: '#EF4444' }]}>Delete</Text>
            </TouchableOpacity>
          )}
         
          <TouchableOpacity
            onPress={handleReportComment}
            style={styles.optionButton}
          >
            <Ionicons name="flag-outline" size={16} color="#6B7280" />
            <Text style={styles.optionText}>Report</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    backgroundColor: '#F3F4F6',
  },
  authorDetails: {
    flex: 1,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  commentDate: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  optionsButton: {
    padding: 4,
  },
  content: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 22,
    marginBottom: 8,
  },
  actions: {
    flexDirection: 'row',
    paddingTop: 8,
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
  replyInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  replyInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    marginRight: 8,
    maxHeight: 80,
  },
  submitReplyButton: {
    padding: 8,
  },
  repliesContainer: {
    marginTop: 8,
  },
  optionsContainer: {
    position: 'absolute',
    right: 16,
    top: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginLeft: 8,
  },
});