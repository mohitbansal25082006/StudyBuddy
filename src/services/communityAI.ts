// F:\StudyBuddy\src\services\communityAI.ts
import { supabase } from './supabase';
import OpenAI from 'openai';

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
});

// AI Topic Tagger
export const tagPostContent = async (content: string): Promise<string[]> => {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an AI assistant that tags educational content with relevant subjects. Return only a JSON array of subject tags like ['Math', 'Physics', 'Chemistry', etc.]"
        },
        {
          role: "user",
          content: `Tag this educational content with relevant subjects: "${content}"`
        }
      ],
      temperature: 0.3,
      max_tokens: 100,
    });

    const tagsText = response.choices[0].message.content || '[]';
    return JSON.parse(tagsText);
  } catch (error) {
    console.error('Error tagging content:', error);
    return [];
  }
};

// AI Writing Assistant
export const improvePostContent = async (content: string): Promise<string> => {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an AI writing assistant that improves educational posts to make them clearer, more engaging, and more informative. Keep the original meaning but enhance the clarity and educational value."
        },
        {
          role: "user",
          content: `Improve this educational post: "${content}"`
        }
      ],
      temperature: 0.5,
      max_tokens: 500,
    });

    return response.choices[0].message.content || content;
  } catch (error) {
    console.error('Error improving content:', error);
    return content;
  }
};

// AI Smart Search
export const semanticSearch = async (query: string, userId: string): Promise<any[]> => {
  try {
    // First, get all posts from the database
    const { data: posts, error: fetchError } = await supabase
      .from('community_posts')
      .select('*')
      .neq('user_id', userId) // Exclude user's own posts
      .order('created_at', { ascending: false })
      .limit(50);

    if (fetchError) throw fetchError;

    // If no posts, return empty array
    if (!posts || posts.length === 0) return [];

    // Use OpenAI to rank posts by relevance
    const postSummaries = posts.map(post => ({
      id: post.id,
      title: post.title,
      content: post.content.substring(0, 200), // Limit content length
      tags: post.tags,
    }));

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an AI assistant that ranks educational posts by relevance to a search query. Return only a JSON array of post IDs ranked by relevance, most relevant first."
        },
        {
          role: "user",
          content: `Rank these posts by relevance to the query: "${query}". Posts: ${JSON.stringify(postSummaries)}`
        }
      ],
      temperature: 0.3,
      max_tokens: 200,
    });

    const rankedIdsText = response.choices[0].message.content || '[]';
    const rankedIds = JSON.parse(rankedIdsText);

    // Sort posts based on the ranking
    const rankedPosts: any[] = [];
    rankedIds.forEach((id: string) => {
      const post = posts.find(p => p.id === id);
      if (post) rankedPosts.push(post);
    });

    // Add any posts not in the ranking at the end
    posts.forEach(post => {
      if (!rankedIds.includes(post.id)) {
        rankedPosts.push(post);
      }
    });

    return rankedPosts;
  } catch (searchError) {
    console.error('Error in semantic search:', searchError);
    // Fallback to basic text search
    try {
      const { data: posts, error: fallbackError } = await supabase
        .from('community_posts')
        .select('*')
        .neq('user_id', userId)
        .or(`title.ilike.%${query}%,content.ilike.%${query}%,tags.cs.{${query}}`)
        .order('created_at', { ascending: false })
        .limit(20);

      if (fallbackError) throw fallbackError;
      return posts || [];
    } catch (fallbackError) {
      console.error('Error in fallback search:', fallbackError);
      return [];
    }
  }
};

// AI Moderation
export const moderateContent = async (content: string): Promise<{ isAppropriate: boolean; reason?: string }> => {
  try {
    const response = await openai.moderations.create({
      input: content,
    });

    const results = response.results[0];
    const flaggedCategories = results.categories;

    // Check if any category is flagged
    const isFlagged = Object.values(flaggedCategories).some(flagged => flagged);

    if (isFlagged) {
      // Get more details about why it was flagged
      const flaggedReasons = Object.entries(flaggedCategories)
        .filter(([_, flagged]) => flagged)
        .map(([category]) => category)
        .join(', ');

      return {
        isAppropriate: false,
        reason: `Content flagged for: ${flaggedReasons}`
      };
    }

    return { isAppropriate: true };
  } catch (error) {
    console.error('Error moderating content:', error);
    // Default to allowing content if moderation fails
    return { isAppropriate: true };
  }
};

// AI Comment Generator
export const generateComment = async (postContent: string, userProfile: any): Promise<string> => {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an AI assistant that generates thoughtful, educational comments on study-related posts. Generate a comment that is helpful, encouraging, and adds value to the discussion."
        },
        {
          role: "user",
          content: `Generate a thoughtful comment for this post: "${postContent}". The user's profile: ${JSON.stringify(userProfile)}`
        }
      ],
      temperature: 0.7,
      max_tokens: 150,
    });

    return response.choices[0].message.content || "Great post! Thanks for sharing.";
  } catch (error) {
    console.error('Error generating comment:', error);
    return "Great post! Thanks for sharing.";
  }
};