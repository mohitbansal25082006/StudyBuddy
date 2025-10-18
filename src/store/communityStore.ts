// F:\StudyBuddy\src\store\communityStore.ts
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persist, createJSONStorage } from 'zustand/middleware';

// Types
export interface CommunityPost {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar: string | null;
  title: string;
  content: string;
  image_url: string | null;
  tags: string[];
  likes: number;
  comments: number;
  liked_by_user: boolean;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  user_name: string;
  user_avatar: string | null;
  content: string;
  likes: number;
  liked_by_user: boolean;
  created_at: string;
  updated_at: string;
}

// Store
interface CommunityState {
  posts: CommunityPost[];
  comments: Comment[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  selectedTags: string[];
  subscriptionActive: boolean;
  
  // Actions
  setPosts: (posts: CommunityPost[] | ((prev: CommunityPost[]) => CommunityPost[])) => void;
  addPost: (post: CommunityPost) => void;
  updatePost: (postId: string, updates: Partial<CommunityPost>) => void;
  deletePost: (postId: string) => void;
  setComments: (comments: Comment[]) => void;
  addComment: (comment: Comment) => void;
  updateComment: (commentId: string, updates: Partial<Comment>) => void;
  deleteComment: (commentId: string) => void;
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
      loading: false,
      error: null,
      searchQuery: '',
      selectedTags: [],
      subscriptionActive: false,
      
      // Actions
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
      
      setLoading: (loading) => set({ loading }),
      
      setError: (error) => set({ error }),
      
      setSearchQuery: (query) => set({ searchQuery: query }),
      
      setSelectedTags: (tags) => set({ selectedTags: tags }),
      
      setSubscriptionActive: (active) => set({ subscriptionActive: active }),
      
      reset: () => set({
        posts: [],
        comments: [],
        loading: false,
        error: null,
        searchQuery: '',
        selectedTags: [],
        subscriptionActive: false
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