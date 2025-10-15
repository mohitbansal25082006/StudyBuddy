// F:\StudyBuddy\src\services\openai.ts
// ============================================
// OPENAI API SERVICE
// Generates AI-powered study plans
// ============================================

import { StudyPlanForm, StudyPlanData } from '../types';

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

// Generate a study plan using OpenAI
export const generateStudyPlan = async (formData: StudyPlanForm): Promise<StudyPlanData> => {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key is not configured');
  }

  const prompt = `
    Create a detailed study plan for a student with the following preferences:
    
    Subject: ${formData.subject}
    Difficulty Level: ${formData.difficulty_level}
    Duration: ${formData.duration_weeks} weeks
    Daily Study Time: ${formData.daily_hours} hours
    Learning Style: ${formData.learning_style}
    Goals: ${formData.goals}
    
    Please provide a structured study plan in JSON format with the following structure:
    {
      "weeks": [
        {
          "week": 1,
          "title": "Week 1: Introduction",
          "topics": ["Topic 1", "Topic 2"],
          "tasks": [
            {
              "id": "task1",
              "title": "Task Title",
              "description": "Task description",
              "duration_minutes": 60,
              "completed": false,
              "type": "reading"
            }
          ]
        }
      ],
      "resources": [
        {
          "id": "resource1",
          "title": "Resource Title",
          "type": "video",
          "url": "https://example.com",
          "description": "Resource description"
        }
      ],
      "milestones": ["Milestone 1", "Milestone 2"]
    }
    
    Make sure the plan is tailored to the ${formData.learning_style} learning style.
    For a ${formData.difficulty_level} level student studying ${formData.subject}.
    The plan should span ${formData.duration_weeks} weeks with approximately ${formData.daily_hours} hours of study per day.
    
    Return only valid JSON without any additional text or formatting.
  `;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert educational planner who creates detailed, personalized study plans for students. Always respond with valid JSON only.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 2000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Parse the JSON response
    try {
      const studyPlanData = JSON.parse(content);
      return studyPlanData;
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content);
      throw new Error('Failed to parse study plan from AI response');
    }
  } catch (error) {
    console.error('Error generating study plan:', error);
    throw error;
  }
};

// Generate flashcard content using OpenAI
export const generateFlashcardContent = async (subject: string, topic: string, count: number = 5): Promise<Array<{question: string, answer: string}>> => {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key is not configured');
  }

  const prompt = `
    Generate ${count} flashcards for the subject "${subject}" focusing on the topic "${topic}".
    
    Please provide the flashcards in JSON format with the following structure:
    [
      {
        "question": "What is...?",
        "answer": "The answer is..."
      }
    ]
    
    Make sure the questions are clear and the answers are concise but informative.
    Return only valid JSON without any additional text or formatting.
  `;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert educator who creates high-quality flashcards for students. Always respond with valid JSON only.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Parse the JSON response
    try {
      const flashcards = JSON.parse(content);
      return flashcards;
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content);
      throw new Error('Failed to parse flashcards from AI response');
    }
  } catch (error) {
    console.error('Error generating flashcards:', error);
    throw error;
  }
};