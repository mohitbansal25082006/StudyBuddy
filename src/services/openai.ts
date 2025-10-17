// F:\StudyBuddy\src\services\openai.ts
// ============================================
// OPENAI API SERVICE
// Generates AI-powered study plans and flashcards
// ============================================

import { StudyPlanForm, StudyPlanData, StudyWeek, StudyResource, StudyTask } from '../types';

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
      "overview": "Brief overview of the study plan",
      "learning_outcomes": ["Outcome 1", "Outcome 2"],
      "assessment_methods": ["Method 1", "Method 2"],
      "weeks": [
        {
          "week": 1,
          "title": "Week 1: Introduction",
          "topics": ["Topic 1", "Topic 2"],
          "objectives": ["Objective 1", "Objective 2"],
          "estimated_total_hours": 10,
          "tasks": [
            {
              "id": "task1",
              "title": "Task Title",
              "description": "Task description",
              "duration_minutes": 60,
              "completed": false,
              "type": "reading",
              "resources": ["resource_id1"],
              "difficulty": "beginner",
              "priority": "medium"
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
          "description": "Resource description",
          "verified": true,
          "rating": 4.5,
          "tags": ["tag1", "tag2"],
          "difficulty": "beginner"
        }
      ],
      "milestones": ["Milestone 1", "Milestone 2"],
      "tips": ["Tip 1", "Tip 2"]
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
        max_tokens: 3000, // Increased from 2000 to handle longer responses
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    let content = data.choices[0].message.content;
    
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
    
    // Try to parse the JSON response
    try {
      const studyPlanData = JSON.parse(content);
      
      // Validate the structure of the response
      if (!studyPlanData.weeks || !Array.isArray(studyPlanData.weeks)) {
        throw new Error('Invalid response format: weeks array is missing');
      }
      
      // Ensure all required fields are present
      studyPlanData.weeks = studyPlanData.weeks.map((week: any, index: number) => {
        if (!week.week) week.week = index + 1;
        if (!week.title) week.title = `Week ${index + 1}`;
        if (!week.topics) week.topics = [];
        if (!week.objectives) week.objectives = [];
        if (!week.estimated_total_hours) week.estimated_total_hours = formData.daily_hours * 7;
        if (!week.tasks) week.tasks = [];
        
        // Ensure all tasks have required fields
        week.tasks = week.tasks.map((task: any, taskIndex: number): StudyTask => {
          return {
            id: task.id || `task${index + 1}_${taskIndex + 1}`,
            title: task.title || 'Untitled Task',
            description: task.description || 'No description',
            duration_minutes: task.duration_minutes || 60,
            completed: task.completed || false,
            type: task.type || 'reading',
            resources: task.resources || [],
            difficulty: task.difficulty || formData.difficulty_level,
            priority: task.priority || 'medium'
          };
        });
        
        return week as StudyWeek;
      });
      
      // Ensure resources array exists and has required fields
      if (!studyPlanData.resources) studyPlanData.resources = [];
      studyPlanData.resources = studyPlanData.resources.map((resource: any): StudyResource => {
        return {
          id: resource.id || `resource_${Math.random().toString(36).substr(2, 9)}`,
          title: resource.title || 'Untitled Resource',
          type: resource.type || 'website',
          url: resource.url || 'https://example.com',
          description: resource.description || 'No description',
          verified: resource.verified || false,
          rating: resource.rating || 0,
          tags: resource.tags || [],
          difficulty: resource.difficulty || formData.difficulty_level
        };
      });
      
      // Ensure milestones array exists
      if (!studyPlanData.milestones) studyPlanData.milestones = [];
      
      // Ensure overview exists
      if (!studyPlanData.overview) {
        studyPlanData.overview = `A comprehensive ${formData.duration_weeks}-week study plan for ${formData.subject} at ${formData.difficulty_level} level.`;
      }
      
      // Ensure learning_outcomes exists
      if (!studyPlanData.learning_outcomes) {
        studyPlanData.learning_outcomes = [
          `Master fundamental concepts of ${formData.subject}`,
          `Apply theoretical knowledge to practical problems`,
          `Develop critical thinking skills in ${formData.subject}`
        ];
      }
      
      // Ensure assessment_methods exists
      if (!studyPlanData.assessment_methods) {
        studyPlanData.assessment_methods = [
          'Weekly quizzes',
          'Practical assignments',
          'Final assessment'
        ];
      }
      
      // Ensure tips exists
      if (!studyPlanData.tips) {
        studyPlanData.tips = [
          'Review material regularly',
          'Practice active recall',
          'Use visual aids when possible'
        ];
      }
      
      return studyPlanData as StudyPlanData;
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content);
      
      // If parsing fails, try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const studyPlanData = JSON.parse(jsonMatch[0]);
          
          // Apply the same validation as above
          if (!studyPlanData.weeks || !Array.isArray(studyPlanData.weeks)) {
            throw new Error('Invalid response format: weeks array is missing');
          }
          
          // Ensure all required fields are present
          studyPlanData.weeks = studyPlanData.weeks.map((week: any, index: number) => {
            if (!week.week) week.week = index + 1;
            if (!week.title) week.title = `Week ${index + 1}`;
            if (!week.topics) week.topics = [];
            if (!week.objectives) week.objectives = [];
            if (!week.estimated_total_hours) week.estimated_total_hours = formData.daily_hours * 7;
            if (!week.tasks) week.tasks = [];
            
            // Ensure all tasks have required fields
            week.tasks = week.tasks.map((task: any, taskIndex: number): StudyTask => {
              return {
                id: task.id || `task${index + 1}_${taskIndex + 1}`,
                title: task.title || 'Untitled Task',
                description: task.description || 'No description',
                duration_minutes: task.duration_minutes || 60,
                completed: task.completed || false,
                type: task.type || 'reading',
                resources: task.resources || [],
                difficulty: task.difficulty || formData.difficulty_level,
                priority: task.priority || 'medium'
              };
            });
            
            return week as StudyWeek;
          });
          
          // Ensure resources array exists and has required fields
          if (!studyPlanData.resources) studyPlanData.resources = [];
          studyPlanData.resources = studyPlanData.resources.map((resource: any): StudyResource => {
            return {
              id: resource.id || `resource_${Math.random().toString(36).substr(2, 9)}`,
              title: resource.title || 'Untitled Resource',
              type: resource.type || 'website',
              url: resource.url || 'https://example.com',
              description: resource.description || 'No description',
              verified: resource.verified || false,
              rating: resource.rating || 0,
              tags: resource.tags || [],
              difficulty: resource.difficulty || formData.difficulty_level
            };
          });
          
          // Ensure milestones array exists
          if (!studyPlanData.milestones) studyPlanData.milestones = [];
          
          // Ensure overview exists
          if (!studyPlanData.overview) {
            studyPlanData.overview = `A comprehensive ${formData.duration_weeks}-week study plan for ${formData.subject} at ${formData.difficulty_level} level.`;
          }
          
          // Ensure learning_outcomes exists
          if (!studyPlanData.learning_outcomes) {
            studyPlanData.learning_outcomes = [
              `Master fundamental concepts of ${formData.subject}`,
              `Apply theoretical knowledge to practical problems`,
              `Develop critical thinking skills in ${formData.subject}`
            ];
          }
          
          // Ensure assessment_methods exists
          if (!studyPlanData.assessment_methods) {
            studyPlanData.assessment_methods = [
              'Weekly quizzes',
              'Practical assignments',
              'Final assessment'
            ];
          }
          
          // Ensure tips exists
          if (!studyPlanData.tips) {
            studyPlanData.tips = [
              'Review material regularly',
              'Practice active recall',
              'Use visual aids when possible'
            ];
          }
          
          return studyPlanData as StudyPlanData;
        } catch (e) {
          console.error('Failed to parse extracted JSON:', e);
        }
      }
      
      // If all else fails, create a basic study plan
      console.warn('Creating fallback study plan due to parsing failure');
      return createFallbackStudyPlan(formData);
    }
  } catch (error) {
    console.error('Error generating study plan:', error);
    throw error;
  }
};

// Create a fallback study plan in case OpenAI fails
const createFallbackStudyPlan = (formData: StudyPlanForm): StudyPlanData => {
  const weeks: StudyWeek[] = [];
  const topicsPerWeek = Math.ceil(10 / formData.duration_weeks); // Approximate number of topics
  
  for (let i = 1; i <= formData.duration_weeks; i++) {
    const weekNumber = i;
    const weekTitle = `Week ${weekNumber}: ${formData.subject} Fundamentals`;
    
    // Generate generic topics
    const topics: string[] = [];
    for (let j = 1; j <= topicsPerWeek; j++) {
      topics.push(`Topic ${j}`);
    }
    
    // Generate objectives
    const objectives: string[] = [
      `Understand fundamental concepts of ${formData.subject} for week ${weekNumber}`,
      `Apply theoretical knowledge to practical problems`
    ];
    
    // Generate tasks
    const tasks: StudyTask[] = [];
    
    // Reading task
    tasks.push({
      id: `task${weekNumber}_1`,
      title: `Read about ${formData.subject} concepts`,
      description: `Study the fundamental concepts of ${formData.subject} for week ${weekNumber}`,
      duration_minutes: formData.daily_hours * 30, // Half of daily time
      completed: false,
      type: 'reading',
      resources: [],
      difficulty: formData.difficulty_level,
      priority: 'medium'
    });
    
    // Practice task
    tasks.push({
      id: `task${weekNumber}_2`,
      title: `Practice ${formData.subject} problems`,
      description: `Apply what you've learned through practice exercises`,
      duration_minutes: formData.daily_hours * 30, // Half of daily time
      completed: false,
      type: 'practice',
      resources: [],
      difficulty: formData.difficulty_level,
      priority: 'medium'
    });
    
    weeks.push({
      week: weekNumber,
      title: weekTitle,
      topics,
      objectives,
      estimated_total_hours: formData.daily_hours * 7,
      tasks
    });
  }
  
  // Generate resources
  const resources: StudyResource[] = [
    {
      id: 'resource1',
      title: `${formData.subject} Textbook`,
      type: 'book',
      url: 'https://example.com/textbook',
      description: `Comprehensive textbook for ${formData.subject}`,
      verified: false,
      rating: 4.0,
      tags: [formData.subject, 'textbook'],
      difficulty: formData.difficulty_level
    },
    {
      id: 'resource2',
      title: `${formData.subject} Video Tutorials`,
      type: 'video',
      url: 'https://example.com/videos',
      description: `Video tutorials covering ${formData.subject} concepts`,
      verified: false,
      rating: 4.0,
      tags: [formData.subject, 'video', 'tutorial'],
      difficulty: formData.difficulty_level
    }
  ];
  
  // Generate milestones
  const milestones: string[] = [];
  const milestoneInterval = Math.ceil(formData.duration_weeks / 3);
  
  for (let i = 1; i <= 3; i++) {
    const milestoneWeek = Math.min(i * milestoneInterval, formData.duration_weeks);
    milestones.push(`Complete Week ${milestoneWeek} assessment`);
  }
  
  // Generate overview
  const overview = `A comprehensive ${formData.duration_weeks}-week study plan for ${formData.subject} at ${formData.difficulty_level} level.`;
  
  // Generate learning outcomes
  const learning_outcomes = [
    `Master fundamental concepts of ${formData.subject}`,
    `Apply theoretical knowledge to practical problems`,
    `Develop critical thinking skills in ${formData.subject}`
  ];
  
  // Generate assessment methods
  const assessment_methods = [
    'Weekly quizzes',
    'Practical assignments',
    'Final assessment'
  ];
  
  // Generate tips
  const tips = [
    'Review material regularly',
    'Practice active recall',
    'Use visual aids when possible'
  ];
  
  return {
    overview,
    learning_outcomes,
    assessment_methods,
    weeks,
    resources,
    milestones,
    tips
  };
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
        max_tokens: 2000,
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

// Generate additional resources for a study plan
export const generateAdditionalResources = async (
  subject: string,
  topics: string[],
  difficulty: string,
  learningStyle: string,
  existingResources: StudyResource[] = []
): Promise<StudyResource[]> => {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key is not configured');
  }

  const existingResourceTitles = existingResources.map(r => r.title).join(', ');
  
  const prompt = `
    Generate 5 additional high-quality educational resources for a student studying ${subject} at ${difficulty} level.
    
    Topics covered: ${topics.join(', ')}
    Learning Style: ${learningStyle}
    
    Please avoid these resources that are already included: ${existingResourceTitles}
    
    Please provide the resources in JSON format with the following structure:
    [
      {
        "id": "resource_id",
        "title": "Resource Title",
        "type": "video|article|book|website|tool|course|podcast|interactive",
        "url": "https://example.com",
        "description": "Detailed description of the resource",
        "verified": true,
        "rating": 4.5,
        "tags": ["tag1", "tag2"],
        "difficulty": "beginner|intermediate|advanced",
        "estimated_time": 30,
        "preview_image": "https://example.com/image.jpg",
        "author": "Author Name",
        "date_published": "2023-01-01"
      }
    ]
    
    Make sure the resources are:
    1. High-quality and reputable
    2. Accessible online (provide working URLs)
    3. Tailored to the ${learningStyle} learning style
    4. Appropriate for ${difficulty} level students
    5. Varied in type (mix of videos, articles, interactive tools, etc.)
    
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
            content: 'You are an expert educational curator who finds high-quality learning resources. Always respond with valid JSON only.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 2500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    let content = data.choices[0].message.content;
    
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
    
    // Parse the JSON response
    try {
      const resourcesData = JSON.parse(content);
      
      // Ensure all resources have required fields
      return resourcesData.map((resource: any): StudyResource => {
        return {
          id: resource.id || `resource_${Math.random().toString(36).substr(2, 9)}`,
          title: resource.title || 'Untitled Resource',
          type: resource.type || 'website',
          url: resource.url || 'https://example.com',
          description: resource.description || 'No description',
          verified: resource.verified || false,
          rating: resource.rating || 0,
          tags: resource.tags || [],
          difficulty: resource.difficulty || difficulty as 'beginner' | 'intermediate' | 'advanced'
        };
      });
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content);
      
      // If parsing fails, try to extract JSON from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          const resourcesData = JSON.parse(jsonMatch[0]);
          
          // Ensure all resources have required fields
          return resourcesData.map((resource: any): StudyResource => {
            return {
              id: resource.id || `resource_${Math.random().toString(36).substr(2, 9)}`,
              title: resource.title || 'Untitled Resource',
              type: resource.type || 'website',
              url: resource.url || 'https://example.com',
              description: resource.description || 'No description',
              verified: resource.verified || false,
              rating: resource.rating || 0,
              tags: resource.tags || [],
              difficulty: resource.difficulty || difficulty as 'beginner' | 'intermediate' | 'advanced'
            };
          });
        } catch (e) {
          console.error('Failed to parse extracted JSON:', e);
        }
      }
      
      // If all else fails, create a basic resource
      console.warn('Creating fallback resources due to parsing failure');
      return createFallbackResources(subject, difficulty);
    }
  } catch (error) {
    console.error('Error generating resources:', error);
    throw error;
  }
};

// Create fallback resources in case OpenAI fails
const createFallbackResources = (subject: string, difficulty: string): StudyResource[] => {
  return [
    {
      id: `fallback_resource_1`,
      title: `${subject} Textbook`,
      type: 'book',
      url: 'https://example.com/textbook',
      description: `Comprehensive textbook for ${subject} at ${difficulty} level`,
      verified: false,
      rating: 4.0,
      tags: [subject, 'textbook'],
      difficulty: difficulty as 'beginner' | 'intermediate' | 'advanced'
    },
    {
      id: `fallback_resource_2`,
      title: `${subject} Video Tutorials`,
      type: 'video',
      url: 'https://example.com/videos',
      description: `Video tutorials covering ${subject} concepts at ${difficulty} level`,
      verified: false,
      rating: 4.0,
      tags: [subject, 'video', 'tutorial'],
      difficulty: difficulty as 'beginner' | 'intermediate' | 'advanced'
    }
  ];
};

// Generate additional tasks for a specific week
export const generateAdditionalTasks = async (
  subject: string,
  weekTitle: string,
  weekTopics: string[],
  difficulty: string,
  learningStyle: string,
  existingTasks: StudyTask[] = []
): Promise<StudyTask[]> => {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key is not configured');
  }

  const existingTaskTitles = existingTasks.map(t => t.title).join(', ');
  
  const prompt = `
    Generate 3 additional study tasks for a student studying ${subject} at ${difficulty} level.
    
    Week: ${weekTitle}
    Topics: ${weekTopics.join(', ')}
    Learning Style: ${learningStyle}
    
    Please avoid these tasks that are already included: ${existingTaskTitles}
    
    Please provide the tasks in JSON format with the following structure:
    [
      {
        "id": "task_id",
        "title": "Task Title",
        "description": "Detailed description of what the student should do",
        "duration_minutes": 60,
        "completed": false,
        "type": "reading|practice|review|assessment|video|project|discussion",
        "resources": ["resource_id1", "resource_id2"],
        "difficulty": "beginner|intermediate|advanced",
        "priority": "low|medium|high",
        "subtasks": [
          {
            "id": "subtask_id",
            "title": "Subtask title",
            "completed": false
          }
        ]
      }
    ]
    
    Make sure the tasks are:
    1. Engaging and interactive
    2. Tailored to the ${learningStyle} learning style
    3. Appropriate for ${difficulty} level students
    4. Varied in type and difficulty
    5. Practical and achievable
    
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
            content: 'You are an expert educational planner who creates engaging study tasks. Always respond with valid JSON only.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 2500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    let content = data.choices[0].message.content;
    
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
    
    // Parse the JSON response
    try {
      const tasksData = JSON.parse(content);
      
      // Ensure all tasks have required fields
      return tasksData.map((task: any): StudyTask => {
        return {
          id: task.id || `task_${Math.random().toString(36).substr(2, 9)}`,
          title: task.title || 'Untitled Task',
          description: task.description || 'No description',
          duration_minutes: task.duration_minutes || 60,
          completed: task.completed || false,
          type: task.type || 'reading',
          resources: task.resources || [],
          difficulty: task.difficulty || difficulty as 'beginner' | 'intermediate' | 'advanced',
          priority: task.priority || 'medium',
          subtasks: task.subtasks || []
        };
      });
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content);
      
      // If parsing fails, try to extract JSON from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          const tasksData = JSON.parse(jsonMatch[0]);
          
          // Ensure all tasks have required fields
          return tasksData.map((task: any): StudyTask => {
            return {
              id: task.id || `task_${Math.random().toString(36).substr(2, 9)}`,
              title: task.title || 'Untitled Task',
              description: task.description || 'No description',
              duration_minutes: task.duration_minutes || 60,
              completed: task.completed || false,
              type: task.type || 'reading',
              resources: task.resources || [],
              difficulty: task.difficulty || difficulty as 'beginner' | 'intermediate' | 'advanced',
              priority: task.priority || 'medium',
              subtasks: task.subtasks || []
            };
          });
        } catch (e) {
          console.error('Failed to parse extracted JSON:', e);
        }
      }
      
      // If all else fails, create a basic task
      console.warn('Creating fallback tasks due to parsing failure');
      return createFallbackTasks(subject, difficulty);
    }
  } catch (error) {
    console.error('Error generating tasks:', error);
    throw error;
  }
};

// Create fallback tasks in case OpenAI fails
const createFallbackTasks = (subject: string, difficulty: string): StudyTask[] => {
  return [
    {
      id: `fallback_task_1`,
      title: `Review ${subject} concepts`,
      description: `Review the key concepts covered in this week's ${subject} material`,
      duration_minutes: 60,
      completed: false,
      type: 'review',
      resources: [],
      difficulty: difficulty as 'beginner' | 'intermediate' | 'advanced',
      priority: 'medium',
      subtasks: [
        {
          id: `fallback_subtask_1`,
          title: 'Summarize key points',
          completed: false
        }
      ]
    },
    {
      id: `fallback_task_2`,
      title: `Practice ${subject} problems`,
      description: `Complete practice problems to reinforce your understanding of ${subject}`,
      duration_minutes: 60,
      completed: false,
      type: 'practice',
      resources: [],
      difficulty: difficulty as 'beginner' | 'intermediate' | 'advanced',
      priority: 'medium',
      subtasks: [
        {
          id: `fallback_subtask_2`,
          title: 'Complete 5 practice problems',
          completed: false
        }
      ]
    }
  ];
};

// Generate study tips for a specific subject and learning style
export const generateStudyTips = async (
  subject: string,
  difficulty: string,
  learningStyle: string
): Promise<string[]> => {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key is not configured');
  }

  const prompt = `
    Generate 5 study tips for a student studying ${subject} at ${difficulty} level with a ${learningStyle} learning style.
    
    Please provide the tips in JSON format with the following structure:
    [
      "Study tip 1",
      "Study tip 2",
      "Study tip 3",
      "Study tip 4",
      "Study tip 5"
    ]
    
    Make sure the tips are:
    1. Specific to ${subject}
    2. Tailored to ${learningStyle} learners
    3. Appropriate for ${difficulty} level students
    4. Actionable and practical
    5. Based on proven learning strategies
    
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
            content: 'You are an expert educational strategist who provides effective study tips. Always respond with valid JSON only.',
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
    let content = data.choices[0].message.content;
    
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
    
    // Parse the JSON response
    try {
      const tipsData = JSON.parse(content);
      return tipsData;
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content);
      
      // If parsing fails, try to extract JSON from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          const tipsData = JSON.parse(jsonMatch[0]);
          return tipsData;
        } catch (e) {
          console.error('Failed to parse extracted JSON:', e);
        }
      }
      
      // If all else fails, create a basic tip
      console.warn('Creating fallback tips due to parsing failure');
      return createFallbackTips(subject, learningStyle);
    }
  } catch (error) {
    console.error('Error generating tips:', error);
    throw error;
  }
};

// Create fallback tips in case OpenAI fails
const createFallbackTips = (subject: string, learningStyle: string): string[] => {
  const generalTips = [
    `Create a dedicated study space for ${subject}`,
    `Break down ${subject} concepts into smaller, manageable parts`,
    `Use visual aids like diagrams and charts for ${subject}`,
    `Practice active recall by testing yourself on ${subject} concepts`,
    `Teach ${subject} concepts to someone else to reinforce your understanding`
  ];
  
  const learningStyleTips: { [key: string]: string[] } = {
    visual: [
      `Use color coding when studying ${subject}`,
      `Create mind maps for ${subject} concepts`,
      `Watch videos about ${subject} to supplement your learning`
    ],
    auditory: [
      `Record yourself explaining ${subject} concepts`,
      `Listen to podcasts about ${subject}`,
      `Discuss ${subject} topics with classmates or friends`
    ],
    reading: [
      `Take detailed notes when studying ${subject}`,
      `Rewrite ${subject} concepts in your own words`,
      `Create summaries of ${subject} chapters`
    ],
    kinesthetic: [
      `Use hands-on activities to learn ${subject}`,
      `Create physical models related to ${subject}`,
      `Take breaks to move around while studying ${subject}`
    ]
  };
  
  // Combine general tips with learning style specific tips
  const tips = [...generalTips];
  if (learningStyleTips[learningStyle]) {
    tips.push(...learningStyleTips[learningStyle]);
  }
  
  // Return only 5 tips
  return tips.slice(0, 5);
};

// Verify and rate resources
export const verifyAndRateResources = async (
  resources: StudyResource[]
): Promise<StudyResource[]> => {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key is not configured');
  }

  const resourceData = resources.map(r => ({
    id: r.id,
    title: r.title,
    url: r.url,
    type: r.type,
    description: r.description,
  }));

  const prompt = `
    Verify and rate the following educational resources:
    
    ${JSON.stringify(resourceData, null, 2)}
    
    Please provide the verification and rating in JSON format with the following structure:
    [
      {
        "id": "resource_id",
        "verified": true,
        "rating": 4.5,
        "verification_notes": "Notes about why this resource is verified or not"
      }
    ]
    
    For verification, check if:
    1. The resource is from a reputable source
    2. The content is accurate and up-to-date
    3. The resource is accessible (URL works)
    4. The content is educational and appropriate
    
    For rating (1-5 stars), consider:
    1. Quality of content
    2. Educational value
    3. Engagement level
    4. Accessibility
    5. Relevance to the subject
    
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
            content: 'You are an expert educational content evaluator who verifies and rates learning resources. Always respond with valid JSON only.',
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
    
    // Parse the JSON response
    try {
      const verificationData = JSON.parse(content);
      
      // Update the original resources with verification data
      return resources.map((resource: StudyResource) => {
        const verification = verificationData.find((v: any) => v.id === resource.id);
        if (verification) {
          return {
            ...resource,
            verified: verification.verified,
            rating: verification.rating,
          };
        }
        return resource;
      });
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content);
      
      // If parsing fails, try to extract JSON from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          const verificationData = JSON.parse(jsonMatch[0]);
          
          // Update the original resources with verification data
          return resources.map((resource: StudyResource) => {
            const verification = verificationData.find((v: any) => v.id === resource.id);
            if (verification) {
              return {
                ...resource,
                verified: verification.verified,
                rating: verification.rating,
              };
            }
            return resource;
          });
        } catch (e) {
          console.error('Failed to parse extracted JSON:', e);
        }
      }
      
      // If all else fails, return the original resources
      console.warn('Returning original resources due to parsing failure');
      return resources;
    }
  } catch (error) {
    console.error('Error verifying resources:', error);
    throw error;
  }
};

// Generate a personalized study schedule
export const generatePersonalizedSchedule = async (
  subject: string,
  difficulty: string,
  learningStyle: string,
  availableHours: number,
  preferredTimeOfDay: string,
  studyGoals: string,
  currentProgress: number = 0
): Promise<any> => {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key is not configured');
  }

  const prompt = `
    Generate a personalized study schedule for a student studying ${subject} at ${difficulty} level.
    
    Learning Style: ${learningStyle}
    Available Hours per Day: ${availableHours}
    Preferred Time of Day: ${preferredTimeOfDay}
    Study Goals: ${studyGoals}
    Current Progress: ${currentProgress}%
    
    Please provide the schedule in JSON format with the following structure:
    {
      "daily_schedule": [
        {
          "day": "Monday",
          "sessions": [
            {
              "time": "9:00 AM",
              "duration_minutes": 60,
              "activity": "Review previous topics",
              "focus_area": "Topic 1"
            }
          ]
        }
      ],
      "weekly_goals": [
        "Complete Chapter 1",
        "Practice problems 1-10"
      ],
      "breaks": [
        {
          "after_minutes": 60,
          "duration_minutes": 15,
          "activity": "Short walk"
        }
      ],
      "productivity_tips": [
        "Tip 1",
        "Tip 2"
      ]
    }
    
    Make sure the schedule is:
    1. Realistic and achievable
    2. Tailored to ${learningStyle} learners
    3. Optimized for ${preferredTimeOfDay} study sessions
    4. Includes appropriate breaks
    5. Progresses logically based on current progress
    
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
            content: 'You are an expert educational planner who creates personalized study schedules. Always respond with valid JSON only.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 2500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    let content = data.choices[0].message.content;
    
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
    
    // Parse the JSON response
    try {
      const scheduleData = JSON.parse(content);
      return scheduleData;
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content);
      
      // If parsing fails, try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const scheduleData = JSON.parse(jsonMatch[0]);
          return scheduleData;
        } catch (e) {
          console.error('Failed to parse extracted JSON:', e);
        }
      }
      
      // If all else fails, create a basic schedule
      console.warn('Creating fallback schedule due to parsing failure');
      return createFallbackSchedule(subject, availableHours, preferredTimeOfDay);
    }
  } catch (error) {
    console.error('Error generating schedule:', error);
    throw error;
  }
};

// Create fallback schedule in case OpenAI fails
const createFallbackSchedule = (
  subject: string,
  availableHours: number,
  preferredTimeOfDay: string
): any => {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const dailySchedule: any[] = [];
  
  days.forEach(day => {
    const sessions: any[] = [];
    
    // Create study sessions based on available hours
    const sessionCount = Math.floor(availableHours / 1); // 1 hour sessions
    for (let i = 0; i < sessionCount; i++) {
      let hour = 9; // Default to 9 AM
      
      if (preferredTimeOfDay === 'morning') {
        hour = 9 + i;
      } else if (preferredTimeOfDay === 'afternoon') {
        hour = 13 + i;
      } else if (preferredTimeOfDay === 'evening') {
        hour = 18 + i;
      } else if (preferredTimeOfDay === 'night') {
        hour = 20 + i;
      }
      
      const timeString = hour < 12 ? `${hour}:00 AM` : hour === 12 ? '12:00 PM' : `${hour - 12}:00 PM`;
      
      sessions.push({
        time: timeString,
        duration_minutes: 60,
        activity: `Study ${subject}`,
        focus_area: `Topic ${i + 1}`
      });
    }
    
    dailySchedule.push({
      day,
      sessions
    });
  });
  
  return {
    daily_schedule: dailySchedule,
    weekly_goals: [
      `Complete ${subject} assignments`,
      `Review ${subject} concepts`
    ],
    breaks: [
      {
        after_minutes: 60,
        duration_minutes: 15,
        activity: 'Short break'
      }
    ],
    productivity_tips: [
      'Stay focused during study sessions',
      'Take regular breaks to maintain concentration'
    ]
  };
};