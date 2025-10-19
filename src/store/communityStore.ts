// F:\StudyBuddy\src\store\communityStore.ts

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persist, createJSONStorage } from 'zustand/middleware';
import { 
  CommunityPost, 
  Comment, 
  CommentReply, 
  PostBookmark, 
  ContentReport,
  PostImage,
  CommunityQuestion,
  QuestionAnswer,
  QuestionComment,
  AnswerComment,
  UserXP,
  UserAchievement,
  LeaderboardEntry,
  XPTransaction
} from '../types';

// Import service functions
import { 
  getCommunityQuestions,
  getLeaderboard,
  getUserLeaderboardRank,
  getUserXP,
  getUserAchievements,
  getXPTransactions
} from '../services/supabase';

// Updated CommunityState interface
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
  
  // Image viewer state
  imageViewerVisible: boolean;
  currentImages: string[];
  currentImageIndex: number;
  
  // Q&A System state
  questions: CommunityQuestion[];
  currentQuestion: CommunityQuestion | null;
  questionAnswers: QuestionAnswer[];
  questionComments: QuestionComment[];
  answerComments: AnswerComment[];
  loadingQuestions: boolean;
  loadingQuestion: boolean;
  loadingAnswers: boolean;
  questionsError: string | null;
  questionsInitialized: boolean;
  
  // Achievements & Leaderboard state
  userXP: UserXP | null;
  userAchievements: UserAchievement[];
  leaderboard: LeaderboardEntry[];
  userRank: number | null;
  xpTransactions: XPTransaction[];
  loadingXP: boolean;
  loadingAchievements: boolean;
  loadingLeaderboard: boolean;
  leaderboardError: string | null;
  achievementsError: string | null;

  // Actions
  setPosts: (posts: CommunityPost[] | ((prev: CommunityPost[]) => CommunityPost[])) => void;
  addPost: (post: CommunityPost) => void;
  updatePost: (postId: string, updates: Partial<CommunityPost>) => void;
  deletePost: (postId: string) => void;
  setComments: (comments: Comment[]) => void;
  addComment: (comment: Comment) => void;
  updateComment: (commentId: string, updates: Partial<Comment>) => void;
  deleteComment: (commentId: string) => void;
  
  // Bookmark actions
  setBookmarks: (bookmarks: PostBookmark[]) => void;
  addBookmark: (bookmark: PostBookmark) => void;
  removeBookmark: (postId: string) => void;
  toggleBookmark: (postId: string, isBookmarked: boolean) => void;
  
  // Reply actions
  addReply: (commentId: string, reply: CommentReply) => void;
  updateReply: (replyId: string, updates: Partial<CommentReply>) => void;
  deleteReply: (commentId: string, replyId: string) => void;
  
  // Report actions
  setReports: (reports: ContentReport[]) => void;
  addReport: (report: ContentReport) => void;
  updateReport: (reportId: string, updates: Partial<ContentReport>) => void;
  
  // Image viewer actions
  showImageViewer: (images: string[], initialIndex: number) => void;
  hideImageViewer: () => void;
  setCurrentImageIndex: (index: number) => void;
  
  // Q&A System actions
  setQuestions: (questions: CommunityQuestion[] | ((prev: CommunityQuestion[]) => CommunityQuestion[])) => void;
  setCurrentQuestion: (question: CommunityQuestion | null) => void;
  setQuestionAnswers: (answers: QuestionAnswer[]) => void;
  addQuestionAnswer: (answer: QuestionAnswer) => void;
  updateQuestionAnswer: (answerId: string, updates: Partial<QuestionAnswer>) => void;
  deleteQuestionAnswer: (answerId: string) => void;
  setQuestionComments: (comments: QuestionComment[]) => void;
  addQuestionComment: (comment: QuestionComment) => void;
  setAnswerComments: (comments: AnswerComment[]) => void;
  addAnswerComment: (comment: AnswerComment) => void;
  setLoadingQuestions: (loading: boolean) => void;
  setLoadingQuestion: (loading: boolean) => void;
  setLoadingAnswers: (loading: boolean) => void;
  setQuestionsError: (error: string | null) => void;
  loadQuestions: (userId: string, limit?: number, offset?: number, sortBy?: 'latest' | 'popular' | 'unanswered') => Promise<void>;
  resetQuestions: () => void;
  
  // Achievements & Leaderboard actions
  setUserXP: (xp: UserXP | null) => void;
  setUserAchievements: (achievements: UserAchievement[]) => void;
  addAchievement: (achievement: UserAchievement) => void;
  setLeaderboard: (leaderboard: LeaderboardEntry[]) => void;
  setUserRank: (rank: number | null) => void;
  setXPTransactions: (transactions: XPTransaction[]) => void;
  setLoadingXP: (loading: boolean) => void;
  setLoadingAchievements: (loading: boolean) => void;
  setLoadingLeaderboard: (loading: boolean) => void;
  setLeaderboardError: (error: string | null) => void;
  setAchievementsError: (error: string | null) => void;
  loadLeaderboardData: (userId: string) => Promise<void>;
  loadAchievementsData: (userId: string) => Promise<void>;
  
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
      questions: [],
      currentQuestion: null,
      questionAnswers: [],
      questionComments: [],
      answerComments: [],
      loadingQuestions: false,
      loadingQuestion: false,
      loadingAnswers: false,
      questionsError: null,
      questionsInitialized: false,
      userXP: null,
      userAchievements: [],
      leaderboard: [],
      userRank: null,
      xpTransactions: [],
      loadingXP: false,
      loadingAchievements: false,
      loadingLeaderboard: false,
      leaderboardError: null,
      achievementsError: null,
      
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
      
      // Bookmark actions
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
      
      // Reply actions
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
      
      // Report actions
      setReports: (reports) => set({ reports }),
      
      addReport: (report) => set((state) => ({ 
        reports: [report, ...state.reports] 
      })),
      
      updateReport: (reportId, updates) => set((state) => ({
        reports: state.reports.map(report => 
          report.id === reportId ? { ...report, ...updates } : report
        )
      })),
      
      // Image viewer actions
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
      
      // Q&A System actions
      setQuestions: (questions) => set((state) => ({ 
        questions: typeof questions === 'function' ? questions(state.questions) : questions,
        questionsInitialized: true
      })),
      
      setCurrentQuestion: (question) => set({ currentQuestion: question }),
      setQuestionAnswers: (answers) => set({ questionAnswers: answers }),
      addQuestionAnswer: (answer) => set((state) => ({ 
        questionAnswers: [answer, ...state.questionAnswers] 
      })),
      updateQuestionAnswer: (answerId, updates) => set((state) => ({
        questionAnswers: state.questionAnswers.map(answer => 
          answer.id === answerId ? { ...answer, ...updates } : answer
        )
      })),
      deleteQuestionAnswer: (answerId) => set((state) => ({
        questionAnswers: state.questionAnswers.filter(answer => answer.id !== answerId)
      })),
      setQuestionComments: (comments) => set({ questionComments: comments }),
      addQuestionComment: (comment) => set((state) => ({ 
        questionComments: [comment, ...state.questionComments] 
      })),
      setAnswerComments: (comments) => set({ answerComments: comments }),
      addAnswerComment: (comment) => set((state) => ({ 
        answerComments: [comment, ...state.answerComments] 
      })),
      setLoadingQuestions: (loading) => set({ loadingQuestions: loading }),
      setLoadingQuestion: (loading) => set({ loadingQuestion: loading }),
      setLoadingAnswers: (loading) => set({ loadingAnswers: loading }),
      setQuestionsError: (error) => set({ questionsError: error }),
      
      // Load questions with error handling
      loadQuestions: async (userId, limit = 20, offset = 0, sortBy = 'latest') => {
        if (!userId) return;
        
        try {
          set((state) => ({ 
            ...state,
            loadingQuestions: true,
            questionsError: null 
          }));
          
          const newQuestions = await getCommunityQuestions(userId, limit, offset, sortBy);
          
          set((state) => ({
            ...state,
            questions: offset === 0 ? (newQuestions || []) : [...state.questions, ...(newQuestions || [])],
            loadingQuestions: false,
            questionsInitialized: true
          }));
        } catch (error: any) {
          console.error('Error loading questions:', error);
          set((state) => ({
            ...state,
            loadingQuestions: false,
            questionsError: error.message || 'Failed to load questions',
            questionsInitialized: true
          }));
        }
      },
      
      // Reset questions
      resetQuestions: () => set((state) => ({
        ...state,
        questions: [],
        questionsInitialized: false,
        loadingQuestions: false,
        questionsError: null
      })),
      
      // Achievements & Leaderboard actions
      setUserXP: (xp) => set({ userXP: xp }),
      setUserAchievements: (achievements) => set({ userAchievements: achievements }),
      addAchievement: (achievement) => set((state) => ({ 
        userAchievements: [achievement, ...state.userAchievements] 
      })),
      setLeaderboard: (leaderboard) => set({ leaderboard }),
      setUserRank: (rank) => set({ userRank: rank }),
      setXPTransactions: (transactions) => set({ xpTransactions: transactions }),
      setLoadingXP: (loading) => set({ loadingXP: loading }),
      setLoadingAchievements: (loading) => set({ loadingAchievements: loading }),
      setLoadingLeaderboard: (loading) => set({ loadingLeaderboard: loading }),
      setLeaderboardError: (error) => set({ leaderboardError: error }),
      setAchievementsError: (error) => set({ achievementsError: error }),
      
      // Load leaderboard data with error handling
      loadLeaderboardData: async (userId) => {
        if (!userId) return;
        
        try {
          set((state) => ({ 
            ...state,
            loadingLeaderboard: true,
            leaderboardError: null 
          }));
          
          // Get leaderboard
          const leaderboardData = await getLeaderboard(50);
          set((state) => ({ ...state, leaderboard: leaderboardData }));
          
          // Get user's rank
          try {
            const rankData = await getUserLeaderboardRank(userId);
            set((state) => ({ ...state, userRank: rankData }));
          } catch (rankError) {
            console.error('Error getting user rank:', rankError);
            // Continue without rank
          }
          
          // Get user XP
          try {
            const xpData = await getUserXP(userId);
            set((state) => ({ ...state, userXP: xpData }));
          } catch (xpError) {
            console.error('Error getting user XP:', xpError);
            // Continue without XP
          }
          
          set((state) => ({ ...state, loadingLeaderboard: false }));
        } catch (error: any) {
          console.error('Error loading leaderboard:', error);
          set((state) => ({
            ...state,
            loadingLeaderboard: false,
            leaderboardError: error.message || 'Failed to load leaderboard'
          }));
        }
      },
      
      // Load achievements data with error handling
      loadAchievementsData: async (userId) => {
        if (!userId) return;
        
        try {
          set((state) => ({ 
            ...state,
            loadingAchievements: true,
            achievementsError: null 
          }));
          
          // Get user achievements
          try {
            const achievementsData = await getUserAchievements(userId);
            set((state) => ({ ...state, userAchievements: achievementsData }));
          } catch (achievementsError) {
            console.error('Error getting achievements:', achievementsError);
            // Continue without achievements
          }
          
          // Get user XP
          try {
            const xpData = await getUserXP(userId);
            set((state) => ({ ...state, userXP: xpData }));
          } catch (xpError) {
            console.error('Error getting user XP:', xpError);
            // Continue without XP
          }
          
          // Get XP transactions
          try {
            const transactionsData = await getXPTransactions(userId, 10);
            set((state) => ({ ...state, xpTransactions: transactionsData }));
          } catch (transactionsError) {
            console.error('Error getting XP transactions:', transactionsError);
            // Continue without transactions
          }
          
          set((state) => ({ ...state, loadingAchievements: false }));
        } catch (error: any) {
          console.error('Error loading achievements:', error);
          set((state) => ({
            ...state,
            loadingAchievements: false,
            achievementsError: error.message || 'Failed to load achievements'
          }));
        }
      },
      
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
        currentImageIndex: 0,
        questions: [],
        currentQuestion: null,
        questionAnswers: [],
        questionComments: [],
        answerComments: [],
        loadingQuestions: false,
        loadingQuestion: false,
        loadingAnswers: false,
        questionsError: null,
        questionsInitialized: false,
        userXP: null,
        userAchievements: [],
        leaderboard: [],
        userRank: null,
        xpTransactions: [],
        loadingXP: false,
        loadingAchievements: false,
        loadingLeaderboard: false,
        leaderboardError: null,
        achievementsError: null
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