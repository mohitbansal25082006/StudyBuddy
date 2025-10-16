// F:\StudyBuddy\src\services\openai.ts
// ============================================
// OPENAI API SERVICE
// Generates AI-powered study plans and flashcards
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
export const generateFlashcardContent = async (
  subject: string, 
  topic: string, 
  count: number = 5,
  includeHints: boolean = false,
  includeExplanations: boolean = false
): Promise<Array<{question: string, answer: string, hint?: string, explanation?: string}>> => {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key is not configured');
  }

  const prompt = `
    Generate ${count} flashcards for the subject "${subject}" focusing on the topic "${topic}".
    
    Please provide the flashcards in JSON format with the following structure:
    [
      {
        "question": "What is...?",
        "answer": "The answer is..."${includeHints ? ',\n        "hint": "A hint to help remember..."' : ''}${includeExplanations ? ',\n        "explanation": "An explanation of the concept..."' : ''}
      }
    ]
    
    Make sure the questions are clear and the answers are concise but informative.
    ${includeHints ? 'Include helpful hints for each flashcard.' : ''}
    ${includeExplanations ? 'Include detailed explanations for each flashcard.' : ''}
    Return only valid JSON without any additional text or formatting.
  `;

  try {
    console.log('Generating flashcards with OpenAI...');
    
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
        max_tokens: 1500,
        temperature: 0.7,
      }),
    });

    console.log('OpenAI response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${errorData.error?.message || `HTTP ${response.status}`}`);
    }

    const data = await response.json();
    console.log('OpenAI response received');
    
    let content = data.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content received from OpenAI');
    }
    
    // Clean up the response to ensure it's valid JSON
    content = content.trim();
    
    // Remove any potential markdown code block markers
    if (content.startsWith('```json')) {
      content = content.replace(/```json\n?/, '');
    }
    if (content.startsWith('```')) {
      content = content.replace(/```\n?/, '');
    }
    if (content.endsWith('```')) {
      content = content.replace(/\n?```$/, '');
    }
    
    console.log('Parsing flashcards...');
    
    // Parse the JSON response
    try {
      const flashcards = JSON.parse(content);
      
      // Validate the structure of the response
      if (!Array.isArray(flashcards)) {
        console.error('Response is not an array:', flashcards);
        throw new Error('Invalid response format: expected an array');
      }
      
      // Ensure each flashcard has the required properties
      for (const card of flashcards) {
        if (!card.question || !card.answer) {
          console.error('Invalid flashcard:', card);
          throw new Error('Flashcard missing required properties');
        }
      }
      
      console.log(`Successfully generated ${flashcards.length} flashcards`);
      return flashcards;
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content);
      
      // If parsing fails, try to extract JSON from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          const flashcards = JSON.parse(jsonMatch[0]);
          console.log(`Successfully extracted ${flashcards.length} flashcards`);
          return flashcards;
        } catch (e) {
          console.error('Failed to parse extracted JSON:', e);
        }
      }
      
      throw new Error('Failed to parse flashcards from AI response');
    }
  } catch (error) {
    console.error('Error generating flashcards:', error);
    throw error;
  }
};

// Generate a hint for a flashcard using OpenAI
export const generateFlashcardHint = async (question: string, answer: string): Promise<string> => {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key is not configured');
  }

  const prompt = `
    Generate a helpful hint for the following flashcard:
    
    Question: ${question}
    Answer: ${answer}
    
    The hint should not give away the answer directly but should guide the user toward remembering it.
    Keep the hint concise (under 100 characters) and make it memorable.
    
    Return only the hint without any additional text or formatting.
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
            content: 'You are an expert educator who creates helpful hints for flashcards. Always respond with only the hint, no additional text.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 100,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const hint = data.choices[0].message.content.trim();
    
    return hint;
  } catch (error) {
    console.error('Error generating hint:', error);
    throw error;
  }
};

// Generate an explanation for a flashcard using OpenAI
export const generateFlashcardExplanation = async (question: string, answer: string): Promise<string> => {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key is not configured');
  }

  const prompt = `
    Generate a detailed explanation for the following flashcard:
    
    Question: ${question}
    Answer: ${answer}
    
    The explanation should help the user understand why the answer is correct and provide additional context.
    Keep the explanation concise but informative (under 200 words).
    
    Return only the explanation without any additional text or formatting.
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
            content: 'You are an expert educator who creates detailed explanations for flashcards. Always respond with only the explanation, no additional text.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const explanation = data.choices[0].message.content.trim();
    
    return explanation;
  } catch (error) {
    console.error('Error generating explanation:', error);
    throw error;
  }
};

// Categorize flashcards with AI
export const categorizeFlashcardsWithAI = async (flashcards: any[]): Promise<any[]> => {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key is not configured');
  }

  const cardData = flashcards.map(card => ({
    id: card.id,
    question: card.question,
    answer: card.answer,
    subject: card.subject,
  }));

  const prompt = `
    Analyze the following flashcards and categorize them by difficulty and topic:
    
    ${JSON.stringify(cardData, null, 2)}
    
    Please provide the categorization in JSON format with the following structure:
    [
      {
        "id": "flashcard_id",
        "difficulty": 1-5,
        "topics": ["topic1", "topic2"],
        "tags": ["tag1", "tag2"]
      }
    ]
    
    Difficulty should be rated from 1 (easiest) to 5 (hardest).
    Topics should be the main concepts covered in the flashcard.
    Tags should be relevant keywords for the flashcard.
    
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
            content: 'You are an expert educator who categorizes flashcards by difficulty and topic. Always respond with valid JSON only.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 2000,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    let content = data.choices[0].message.content;
    
    content = content.trim();
    
    if (content.startsWith('```json')) {
      content = content.replace(/```json\n?/, '');
    }
    if (content.endsWith('```')) {
      content = content.replace(/\n?```$/, '');
    }
    
    try {
      const categorizedCards = JSON.parse(content);
      return categorizedCards;
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content);
      
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          const categorizedCards = JSON.parse(jsonMatch[0]);
          return categorizedCards;
        } catch (e) {
          console.error('Failed to parse extracted JSON:', e);
        }
      }
      
      throw new Error('Failed to parse categorization from AI response');
    }
  } catch (error) {
    console.error('Error categorizing flashcards:', error);
    throw error;
  }
};

// Optimize study schedule with AI
export const optimizeStudySchedule = async (flashcards: any[], learningStyle: string): Promise<any[]> => {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key is not configured');
  }

  const cardData = flashcards.map(card => ({
    id: card.id,
    question: card.question,
    answer: card.answer,
    subject: card.subject,
    difficulty: card.difficulty,
    review_count: card.review_count,
    correct_count: card.correct_count,
    last_reviewed: card.last_reviewed,
    next_review: card.next_review,
  }));

  const prompt = `
    Optimize the study schedule for the following flashcards based on spaced repetition and the user's learning style (${learningStyle}):
    
    ${JSON.stringify(cardData, null, 2)}
    
    Please provide an optimized schedule in JSON format with the following structure:
    [
      {
        "id": "flashcard_id",
        "next_review": "YYYY-MM-DD",
        "difficulty": 1-5
      }
    ]
    
    Consider the following factors:
    1. Cards with lower accuracy should be reviewed more frequently
    2. Cards that haven't been reviewed recently should be prioritized
    3. Adjust difficulty based on performance
    4. Tailor the schedule to the ${learningStyle} learning style
    
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
            content: 'You are an expert educational planner who optimizes study schedules using spaced repetition. Always respond with valid JSON only.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 2000,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    let content = data.choices[0].message.content;
    
    content = content.trim();
    
    if (content.startsWith('```json')) {
      content = content.replace(/```json\n?/, '');
    }
    if (content.endsWith('```')) {
      content = content.replace(/\n?```$/, '');
    }
    
    try {
      const optimizedSchedule = JSON.parse(content);
      return optimizedSchedule;
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content);
      
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          const optimizedSchedule = JSON.parse(jsonMatch[0]);
          return optimizedSchedule;
        } catch (e) {
          console.error('Failed to parse extracted JSON:', e);
        }
      }
      
      throw new Error('Failed to parse optimized schedule from AI response');
    }
  } catch (error) {
    console.error('Error optimizing study schedule:', error);
    throw error;
  }
};