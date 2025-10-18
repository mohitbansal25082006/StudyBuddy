// F:\StudyBuddy\src\store\communityStore.ts
// Update the existing file with these additions

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persist, createJSONStorage } from 'zustand/middleware';
import { 
  CommunityPost, 
  Comment, 
  CommentReply, 
  PostBookmark, 
  ContentReport,
  PostImage 
} from '../types';

// Update the existing CommunityState interface
interface CommunityState {
  posts: CommunityPost[];
  comments: Comment[];
  bookmarks: PostBookmark[];
  reports: ContentReport[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  selectedTags: string[];
  subscriptionActive: boolean;
  
  // New state for image viewer
  imageViewerVisible: boolean;
  currentImages: string[];
  currentImageIndex: number;
  
  // Actions
  setPosts: (posts: CommunityPost[] | ((prev: CommunityPost[]) => CommunityPost[])) => void;
  addPost: (post: CommunityPost) => void;
  updatePost: (postId: string, updates: Partial<CommunityPost>) => void;
  deletePost: (postId: string) => void;
  setComments: (comments: Comment[]) => void;
  addComment: (comment: Comment) => void;
  updateComment: (commentId: string, updates: Partial<Comment>) => void;
  deleteComment: (commentId: string) => void;
  
  // New bookmark actions
  setBookmarks: (bookmarks: PostBookmark[]) => void;
  addBookmark: (bookmark: PostBookmark) => void;
  removeBookmark: (postId: string) => void;
  toggleBookmark: (postId: string, isBookmarked: boolean) => void;
  
  // New reply actions
  addReply: (commentId: string, reply: CommentReply) => void;
  updateReply: (replyId: string, updates: Partial<CommentReply>) => void;
  deleteReply: (commentId: string, replyId: string) => void;
  
  // New report actions
  setReports: (reports: ContentReport[]) => void;
  addReport: (report: ContentReport) => void;
  updateReport: (reportId: string, updates: Partial<ContentReport>) => void;
  
  // New image viewer actions
  showImageViewer: (images: string[], initialIndex: number) => void;
  hideImageViewer: () => void;
  setCurrentImageIndex: (index: number) => void;
  
  // Existing actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSearchQuery: (query: string) => void;
  setSelectedTags: (tags: string[]) => void;
  setSubscriptionActive: (active: boolean) => void;
  reset: () => void;
}

export const useCommunityStore = create<CommunityState>()(
  persist(
    (set, get) => ({
      // Initial state
      posts: [],
      comments: [],
      bookmarks: [],
      reports: [],
      loading: false,
      error: null,
      searchQuery: '',
      selectedTags: [],
      subscriptionActive: false,
      imageViewerVisible: false,
      currentImages: [],
      currentImageIndex: 0,
      
      // Existing actions
      setPosts: (posts) => set((state) => ({ 
        posts: typeof posts === 'function' ? posts(state.posts) : posts 
      })),
      
      addPost: (post) => set((state) => ({ 
        posts: [post, ...state.posts] 
      })),
      
      updatePost: (postId, updates) => set((state) => ({
        posts: state.posts.map(post => 
          post.id === postId ? { ...post, ...updates } : post
        )
      })),
      
      deletePost: (postId) => set((state) => ({
        posts: state.posts.filter(post => post.id !== postId),
        comments: state.comments.filter(comment => comment.post_id !== postId)
      })),
      
      setComments: (comments) => set({ comments }),
      
      addComment: (comment) => set((state) => ({ 
        comments: [comment, ...state.comments],
        posts: state.posts.map(post => 
          post.id === comment.post_id 
            ? { ...post, comments: post.comments + 1 } 
            : post
        )
      })),
      
      updateComment: (commentId, updates) => set((state) => ({
        comments: state.comments.map(comment => 
          comment.id === commentId ? { ...comment, ...updates } : comment
        )
      })),
      
      deleteComment: (commentId) => set((state) => {
        const commentToDelete = state.comments.find(c => c.id === commentId);
        return {
          comments: state.comments.filter(comment => comment.id !== commentId),
          posts: commentToDelete 
            ? state.posts.map(post => 
                post.id === commentToDelete.post_id 
                  ? { ...post, comments: Math.max(0, post.comments - 1) } 
                  : post
              )
            : state.posts
        };
      }),
      
      // New bookmark actions
      setBookmarks: (bookmarks) => set({ bookmarks }),
      
      addBookmark: (bookmark) => set((state) => ({ 
        bookmarks: [bookmark, ...state.bookmarks],
        posts: state.posts.map(post => 
          post.id === bookmark.post_id 
            ? { ...post, bookmarked_by_user: true } 
            : post
        )
      })),
      
      removeBookmark: (postId) => set((state) => ({
        bookmarks: state.bookmarks.filter(bookmark => bookmark.post_id !== postId),
        posts: state.posts.map(post => 
          post.id === postId 
            ? { ...post, bookmarked_by_user: false } 
            : post
        )
      })),
      
      toggleBookmark: (postId, isBookmarked) => set((state) => ({
        posts: state.posts.map(post => 
          post.id === postId 
            ? { ...post, bookmarked_by_user: isBookmarked } 
            : post
        )
      })),
      
      // New reply actions
      addReply: (commentId, reply) => set((state) => ({
        comments: state.comments.map(comment => 
          comment.id === commentId 
            ? { ...comment, replies: [reply, ...comment.replies] } 
            : comment
        )
      })),
      
      updateReply: (replyId, updates) => set((state) => ({
        comments: state.comments.map(comment => ({
          ...comment,
          replies: comment.replies.map(reply => 
            reply.id === replyId ? { ...reply, ...updates } : reply
          )
        }))
      })),
      
      deleteReply: (commentId, replyId) => set((state) => ({
        comments: state.comments.map(comment => 
          comment.id === commentId 
            ? { ...comment, replies: comment.replies.filter(reply => reply.id !== replyId) } 
            : comment
        )
      })),
      
      // New report actions
      setReports: (reports) => set({ reports }),
      
      addReport: (report) => set((state) => ({ 
        reports: [report, ...state.reports] 
      })),
      
      updateReport: (reportId, updates) => set((state) => ({
        reports: state.reports.map(report => 
          report.id === reportId ? { ...report, ...updates } : report
        )
      })),
      
      // New image viewer actions
      showImageViewer: (images, initialIndex) => set({ 
        imageViewerVisible: true,
        currentImages: images,
        currentImageIndex: initialIndex
      }),
      
      hideImageViewer: () => set({ 
        imageViewerVisible: false 
      }),
      
      setCurrentImageIndex: (index) => set({ 
        currentImageIndex: index 
      }),
      
      // Existing actions
      setLoading: (loading) => set({ loading }),
      
      setError: (error) => set({ error }),
      
      setSearchQuery: (query) => set({ searchQuery: query }),
      
      setSelectedTags: (tags) => set({ selectedTags: tags }),
      
      setSubscriptionActive: (active) => set({ subscriptionActive: active }),
      
      reset: () => set({
        posts: [],
        comments: [],
        bookmarks: [],
        reports: [],
        loading: false,
        error: null,
        searchQuery: '',
        selectedTags: [],
        subscriptionActive: false,
        imageViewerVisible: false,
        currentImages: [],
        currentImageIndex: 0
      })
    }),
    {
      name: 'community-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        searchQuery: state.searchQuery,
        selectedTags: state.selectedTags
      })
    }
  )
);