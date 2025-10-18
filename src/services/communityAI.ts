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

// Enhanced AI Moderation for content and images
export const advancedModerateContent = async (
  content: string,
  images?: string[]
): Promise<{
  isAppropriate: boolean;
  reason?: string;
  imageViolations?: { url: string; reason: string }[]
}> => {
  try {
    // First, moderate text content
    const textResponse = await openai.moderations.create({
      input: content,
    });
    const textResults = textResponse.results[0];
    const textFlaggedCategories = textResults.categories;
    const isTextFlagged = Object.values(textFlaggedCategories).some(flagged => flagged);
    if (isTextFlagged) {
      const flaggedReasons = Object.entries(textFlaggedCategories)
        .filter(([_, flagged]) => flagged)
        .map(([category]) => category)
        .join(', ');
      return {
        isAppropriate: false,
        reason: `Content flagged for: ${flaggedReasons}`
      };
    }
    // If there are images, check them too
    if (images && images.length > 0) {
      const imageViolations = [];
     
      for (const imageUrl of images) {
        try {
          // For image moderation, we'll use a text-based approach
          // In a production app, you might use a dedicated image moderation API
          const imageAnalysis = await openai.chat.completions.create({
            model: "gpt-4-vision-preview",
            messages: [
              {
                role: "system",
                content: "You are an AI content moderator. Analyze the image for any inappropriate content including violence, adult content, hate symbols, or other violations of community guidelines. Respond with only 'APPROPRIATE' if the image follows community guidelines, or 'INAPPROPRIATE: [reason]' if it violates guidelines."
              },
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: "Analyze this image for community guideline violations:"
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: imageUrl
                    }
                  }
                ]
              }
            ],
            max_tokens: 50,
          });
          const analysis = imageAnalysis.choices[0].message.content || '';
         
          if (analysis.startsWith('INAPPROPRIATE')) {
            const reason = analysis.replace('INAPPROPRIATE:', '').trim();
            imageViolations.push({
              url: imageUrl,
              reason
            });
          }
        } catch (error) {
          console.error('Error moderating image:', error);
          // If we can't analyze an image, we'll assume it's appropriate
          // In production, you might want to flag it for manual review
        }
      }
      if (imageViolations.length > 0) {
        return {
          isAppropriate: false,
          reason: 'One or more images violate community guidelines',
          imageViolations
        };
      }
    }
    return { isAppropriate: true };
  } catch (error) {
    console.error('Error in advanced moderation:', error);
    // Default to allowing content if moderation fails
    return { isAppropriate: true };
  }
};

// AI Report Analysis
export const analyzeReport = async (
  contentType: 'post' | 'comment' | 'reply',
  content: string,
  reportReason: string,
  reportDescription?: string
): Promise<{
  isViolation: boolean;
  confidence: number;
  explanation: string;
  recommendedAction: 'remove' | 'warn' | 'dismiss';
}> => {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an AI content moderator analyzing reports. Analyze the reported content and determine if it violates community guidelines. Respond with a JSON object containing: isViolation (boolean), confidence (0-1), explanation (string), and recommendedAction ('remove', 'warn', or 'dismiss')."
        },
        {
          role: "user",
          content: `Analyze this report:
          Content Type: ${contentType}
          Content: "${content}"
          Report Reason: ${reportReason}
          Report Description: ${reportDescription || 'None provided'}
         
          Determine if this content violates community guidelines and provide a recommendation.`
        }
      ],
      temperature: 0.3,
      max_tokens: 200,
    });
    const analysisText = response.choices[0].message.content || '{}';
    const analysis = JSON.parse(analysisText);
   
    return {
      isViolation: analysis.isViolation || false,
      confidence: analysis.confidence || 0.5,
      explanation: analysis.explanation || 'Unable to determine violation status',
      recommendedAction: analysis.recommendedAction || 'dismiss'
    };
  } catch (error) {
    console.error('Error analyzing report:', error);
    return {
      isViolation: false,
      confidence: 0.1,
      explanation: 'Error analyzing report',
      recommendedAction: 'dismiss'
    };
  }
};

// AI Content Improvement (existing function enhanced)
export const improvePostContent = async (content: string): Promise<string> => {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an AI writing assistant that improves educational posts to make them clearer, more engaging, and more informative. Keep the original meaning but enhance the clarity and educational value. Ensure the improved content still follows community guidelines."
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

// AI Comment Generator (existing function enhanced)
export const generateComment = async (postContent: string, userProfile: any): Promise<string> => {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an AI assistant that generates thoughtful, educational comments on study-related posts. Generate a comment that is helpful, encouraging, adds value to the discussion, and follows community guidelines."
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

// AI Reply Generator
export const generateReply = async (
  commentContent: string,
  userProfile: any
): Promise<string> => {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an AI assistant that generates thoughtful replies to comments on educational posts. Generate a reply that is helpful, respectful, adds value to the discussion, and follows community guidelines."
        },
        {
          role: "user",
          content: `Generate a thoughtful reply to this comment: "${commentContent}". The user's profile: ${JSON.stringify(userProfile)}`
        }
      ],
      temperature: 0.7,
      max_tokens: 150,
    });
    return response.choices[0].message.content || "Thanks for your comment!";
  } catch (error) {
    console.error('Error generating reply:', error);
    return "Thanks for your comment!";
  }
};