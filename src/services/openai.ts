// F:\StudyBuddy\src\services\openai.ts
// ============================================
// OPENAI API SERVICE
// Generates AI-powered study plans and flashcards
// ============================================

import { StudyPlanForm, StudyPlanData, StudyWeek, StudyResource, StudyTask } from '../types';

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
const SERPAPI_API_KEY = process.env.EXPO_PUBLIC_SERPAPI_API_KEY;

// Configuration for API requests - INCREASED TIMEOUTS
const API_TIMEOUT = 90000; // 90 seconds timeout
const PLAN_GENERATION_TIMEOUT = 180000; // 3 minutes timeout specifically for plan generation
const MAX_RETRIES = 1; // Reduced retries to avoid long waits

// Helper function for fetch with timeout
async function fetchWithTimeout(url: string, options: RequestInit, timeout: number): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

// Function to search for real resources using SERPApi
const searchForResources = async (subject: string, topics: string[], difficulty: string, learningStyle: string): Promise<any[]> => {
  if (!SERPAPI_API_KEY) {
    console.warn('SERPApi key not configured, using placeholder resources');
    return [];
  }

  try {
    // Create search queries based on subject, topics, difficulty, and learning style
    const searchQueries = [
      `${subject} ${difficulty} ${learningStyle} tutorial`,
      `${subject} ${difficulty} ${learningStyle} course`,
      `${subject} ${difficulty} ${learningStyle} practice problems`,
      ...topics.slice(0, 2).map(topic => `${subject} ${topic} ${difficulty} ${learningStyle} tutorial`)
    ];

    const resources = [];
    
    for (const query of searchQueries.slice(0, 3)) { // Limit to 3 queries to avoid rate limits
      const response = await fetchWithTimeout(`https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&api_key=${SERPAPI_API_KEY}`, {
        method: 'GET',
      }, API_TIMEOUT);
      
      if (!response.ok) {
        console.error(`SERPApi error for query "${query}":`, response.status);
        continue;
      }
      
      const data = await response.json();
      
      if (data.organic_results && data.organic_results.length > 0) {
        // Take the top 2 results from each query
        const topResults = data.organic_results.slice(0, 2).map((result: any) => ({
          title: result.title,
          url: result.link,
          description: result.snippet || '',
          type: result.link.includes('youtube') || result.link.includes('watch') ? 'video' : 
                result.link.includes('coursera') || result.link.includes('udemy') || result.link.includes('edx') ? 'course' :
                result.link.includes('pdf') || result.link.includes('article') ? 'article' : 'website',
          verified: false, // We'll verify these later
          rating: 0,
          tags: [subject, difficulty, learningStyle],
          difficulty: difficulty as 'beginner' | 'intermediate' | 'advanced'
        }));
        
        resources.push(...topResults);
      }
    }
    
    return resources;
  } catch (error) {
    console.error('Error searching for resources with SERPApi:', error);
    return [];
  }
};

// Helper function to get learning style specific instructions
const getLearningStyleInstructions = (learningStyle: string): string => {
  switch (learningStyle) {
    case 'visual':
      return `Focus on visual learning methods such as diagrams, charts, mind maps, videos, and color-coding. Include visual aids and suggest creating visual summaries of concepts.`;
    case 'auditory':
      return `Focus on auditory learning methods such as discussions, lectures, podcasts, and verbal explanations. Include activities that involve listening and speaking.`;
    case 'reading':
      return `Focus on reading and writing methods such as textbooks, articles, note-taking, and written summaries. Include plenty of reading materials and writing exercises.`;
    case 'kinesthetic':
      return `Focus on hands-on learning methods such as practical exercises, experiments, real-world applications, and physical activities. Include interactive elements and movement-based learning.`;
    default:
      return `Use a balanced approach with various learning methods.`;
  }
};

// Helper function to get difficulty level specific instructions
const getDifficultyInstructions = (difficulty: string): string => {
  switch (difficulty) {
    case 'beginner':
      return `Start with fundamental concepts and gradually build up complexity. Include clear explanations, definitions, and simple examples. Avoid overly technical jargon.`;
    case 'intermediate':
      return `Build on existing knowledge with more complex concepts and applications. Include practical examples and some theoretical background. Assume basic familiarity with the subject.`;
    case 'advanced':
      return `Focus on complex concepts, critical analysis, and specialized topics. Include challenging problems, advanced theories, and current research in the field. Assume strong foundational knowledge.`;
    default:
      return `Provide content appropriate for the specified level.`;
  }
};

// Helper function to generate task types based on learning style
const getTaskTypesForLearningStyle = (learningStyle: string): Array<'reading' | 'video' | 'practice' | 'review' | 'discussion' | 'assessment' | 'project'> => {
  switch (learningStyle) {
    case 'visual':
      return ['reading', 'video', 'practice', 'review'];
    case 'auditory':
      return ['video', 'discussion', 'practice', 'review'];
    case 'reading':
      return ['reading', 'practice', 'review', 'assessment'];
    case 'kinesthetic':
      return ['practice', 'project', 'assessment', 'discussion'];
    default:
      return ['reading', 'practice', 'review', 'assessment'];
  }
};

// Generate a study plan using OpenAI
export const generateStudyPlan = async (formData: StudyPlanForm): Promise<StudyPlanData> => {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key is not configured');
  }

  // Calculate total study hours and distribute across weeks
  const totalStudyHours = formData.duration_weeks * formData.daily_hours * 7; // hours per week
  const hoursPerWeek = formData.daily_hours * 7;
  
  // Calculate approximate number of topics based on duration
  const topicsPerWeek = Math.max(2, Math.min(5, Math.ceil(10 / formData.duration_weeks)));
  const totalTopics = formData.duration_weeks * topicsPerWeek;
  
  // Get learning style and difficulty specific instructions
  const learningStyleInstructions = getLearningStyleInstructions(formData.learning_style);
  const difficultyInstructions = getDifficultyInstructions(formData.difficulty_level);
  const taskTypes = getTaskTypesForLearningStyle(formData.learning_style);

  const prompt = `
    Create a detailed study plan for a student with the following preferences:
    
    Subject: ${formData.subject}
    Difficulty Level: ${formData.difficulty_level}
    Duration: ${formData.duration_weeks} weeks
    Daily Study Time: ${formData.daily_hours} hours
    Learning Style: ${formData.learning_style}
    Goals: ${formData.goals}
    
    IMPORTANT: Create EXACTLY ${formData.duration_weeks} weeks of content, with each week containing approximately ${topicsPerWeek} topics.
    Each week should have study tasks that total approximately ${hoursPerWeek} hours (${formData.daily_hours} hours per day).
    
    LEARNING STYLE APPROACH: ${learningStyleInstructions}
    
    DIFFICULTY LEVEL APPROACH: ${difficultyInstructions}
    
    TASK TYPES TO INCLUDE: ${taskTypes.join(', ')}
    
    Please provide a structured study plan in JSON format with the following structure:
    {
      "overview": "Brief overview of the study plan tailored to the student's goals and learning style",
      "learning_outcomes": ["Outcome 1", "Outcome 2", "Outcome 3"],
      "assessment_methods": ["Method 1", "Method 2", "Method 3"],
      "weeks": [
        {
          "week": 1,
          "title": "Week 1: Introduction",
          "topics": ["Topic 1", "Topic 2"],
          "objectives": ["Objective 1", "Objective 2"],
          "estimated_total_hours": ${hoursPerWeek},
          "tasks": [
            {
              "id": "task1",
              "title": "Task Title",
              "description": "Task description",
              "duration_minutes": ${formData.daily_hours * 30},
              "completed": false,
              "type": "reading",
              "resources": [],
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
      "tips": ["Tip 1", "Tip 2", "Tip 3"]
    }
    
    Make sure the plan is:
    1. Tailored to the ${formData.learning_style} learning style with appropriate activities
    2. Appropriate for a ${formData.difficulty_level} level student studying ${formData.subject}
    3. Aligned with the student's goals: ${formData.goals}
    4. Spanning EXACTLY ${formData.duration_weeks} weeks with approximately ${formData.daily_hours} hours of study per day
    5. Including a variety of task types suitable for ${formData.learning_style} learners
    6. Progressively building knowledge from week to week
    
    CRITICAL: You must create content for ALL ${formData.duration_weeks} weeks, not just 1-2 weeks.
    Each week should have a reasonable amount of content that can be completed in ${hoursPerWeek} hours.
    
    Return only valid JSON without any additional text or formatting.
  `;

  try {
    const response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
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
        max_tokens: 4000, // Increased to handle longer responses
        temperature: 0.7,
      }),
    }, PLAN_GENERATION_TIMEOUT);

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
      let studyPlanData = JSON.parse(content);
      
      // Validate the structure of the response
      if (!studyPlanData.weeks || !Array.isArray(studyPlanData.weeks)) {
        throw new Error('Invalid response format: weeks array is missing');
      }
      
      // Check if we have the correct number of weeks
      if (studyPlanData.weeks.length !== formData.duration_weeks) {
        console.warn(`Expected ${formData.duration_weeks} weeks but got ${studyPlanData.weeks.length}. Adjusting...`);
        
        // If we have too few weeks, extend the plan
        if (studyPlanData.weeks.length < formData.duration_weeks) {
          const lastWeek = studyPlanData.weeks[studyPlanData.weeks.length - 1];
          const additionalWeeksNeeded = formData.duration_weeks - studyPlanData.weeks.length;
          
          for (let i = 0; i < additionalWeeksNeeded; i++) {
            const weekNumber = studyPlanData.weeks.length + 1;
            const newWeek = {
              week: weekNumber,
              title: `Week ${weekNumber}: Advanced ${formData.subject} Topics`,
              topics: [`Advanced Topic ${weekNumber}`, `Practice ${weekNumber}`],
              objectives: [`Master advanced concepts for week ${weekNumber}`, `Apply knowledge through practice`],
              estimated_total_hours: hoursPerWeek,
              tasks: [
                {
                  id: `task${weekNumber}_1`,
                  title: `Study advanced ${formData.subject} concepts`,
                  description: `Study advanced concepts for week ${weekNumber}`,
                  duration_minutes: formData.daily_hours * 30,
                  completed: false,
                  type: taskTypes[0],
                  resources: [],
                  difficulty: formData.difficulty_level,
                  priority: 'medium'
                },
                {
                  id: `task${weekNumber}_2`,
                  title: `Practice ${formData.subject} problems`,
                  description: `Practice problems for week ${weekNumber}`,
                  duration_minutes: formData.daily_hours * 30,
                  completed: false,
                  type: taskTypes[1],
                  resources: [],
                  difficulty: formData.difficulty_level,
                  priority: 'medium'
                }
              ]
            };
            studyPlanData.weeks.push(newWeek);
          }
        }
        // If we have too many weeks, truncate the plan
        else if (studyPlanData.weeks.length > formData.duration_weeks) {
          studyPlanData.weeks = studyPlanData.weeks.slice(0, formData.duration_weeks);
        }
      }
      
      // Ensure all required fields are present and adjust task durations
      studyPlanData.weeks = studyPlanData.weeks.map((week: any, index: number) => {
        if (!week.week) week.week = index + 1;
        if (!week.title) week.title = `Week ${index + 1}`;
        if (!week.topics) week.topics = [];
        if (!week.objectives) week.objectives = [];
        if (!week.estimated_total_hours) week.estimated_total_hours = hoursPerWeek;
        if (!week.tasks) week.tasks = [];
        
        // Calculate total minutes for the week based on daily hours
        const totalMinutesForWeek = formData.daily_hours * 60 * 7;
        
        // Ensure all tasks have required fields and adjust durations
        week.tasks = week.tasks.map((task: any, taskIndex: number): StudyTask => {
          // Distribute time evenly among tasks, but ensure each task has a reasonable minimum
          const taskCount = week.tasks.length;
          const minutesPerTask = Math.max(30, Math.floor(totalMinutesForWeek / taskCount));
          
          // Ensure task type is appropriate for learning style
          let taskType: 'reading' | 'video' | 'practice' | 'review' | 'discussion' | 'assessment' | 'project' = task.type || 'reading';
          if (!taskTypes.includes(taskType)) {
            taskType = taskTypes[0];
          }
          
          return {
            id: task.id || `task${index + 1}_${taskIndex + 1}`,
            title: task.title || 'Untitled Task',
            description: task.description || 'No description',
            duration_minutes: task.duration_minutes || minutesPerTask,
            completed: task.completed || false,
            type: taskType,
            resources: task.resources || [],
            difficulty: task.difficulty || formData.difficulty_level,
            priority: task.priority || 'medium'
          };
        });
        
        return week as StudyWeek;
      });
      
      // Search for real resources using SERPApi
      const allTopics = studyPlanData.weeks.flatMap((week: StudyWeek) => week.topics);
      const realResources = await searchForResources(formData.subject, allTopics, formData.difficulty_level, formData.learning_style);
      
      // Ensure resources array exists and has required fields
      if (!studyPlanData.resources) studyPlanData.resources = [];
      
      // Add real resources if we found any
      if (realResources.length > 0) {
        // Add real resources with proper IDs
        const resourcesWithIds = realResources.map((resource, index) => ({
          ...resource,
          id: `real_resource_${index + 1}`
        }));
        
        // Combine existing resources with real ones
        studyPlanData.resources = [...resourcesWithIds, ...studyPlanData.resources];
      }
      
      // If we don't have enough real resources, add placeholder resources
      if (studyPlanData.resources.length < 3) {
        const placeholderResources = [
          {
            id: `placeholder_resource_1`,
            title: `${formData.subject} Textbook for ${formData.learning_style} learners`,
            type: 'book',
            url: 'https://example.com/textbook',
            description: `Comprehensive textbook for ${formData.subject} tailored to ${formData.learning_style} learners at ${formData.difficulty_level} level`,
            verified: false,
            rating: 4.0,
            tags: [formData.subject, 'textbook', formData.learning_style],
            difficulty: formData.difficulty_level
          },
          {
            id: `placeholder_resource_2`,
            title: `${formData.subject} ${formData.learning_style} Video Tutorials`,
            type: 'video',
            url: 'https://example.com/videos',
            description: `Video tutorials covering ${formData.subject} concepts for ${formData.learning_style} learners at ${formData.difficulty_level} level`,
            verified: false,
            rating: 4.0,
            tags: [formData.subject, 'video', 'tutorial', formData.learning_style],
            difficulty: formData.difficulty_level
          }
        ];
        
        studyPlanData.resources = [...studyPlanData.resources, ...placeholderResources];
      }
      
      // Ensure milestones array exists and is aligned with goals
      if (!studyPlanData.milestones) studyPlanData.milestones = [];
      
      // Add milestones based on goals
      if (formData.goals) {
        const goalMilestones = [
          `Complete foundational ${formData.subject} concepts`,
          `Apply ${formData.subject} knowledge to achieve: ${formData.goals}`,
          `Master advanced ${formData.subject} techniques for your goals`
        ];
        studyPlanData.milestones = [...studyPlanData.milestones, ...goalMilestones];
      }
      
      // Ensure overview exists and is personalized
      if (!studyPlanData.overview) {
        studyPlanData.overview = `A comprehensive ${formData.duration_weeks}-week study plan for ${formData.subject} at ${formData.difficulty_level} level, designed specifically for ${formData.learning_style} learners to achieve: ${formData.goals}`;
      }
      
      // Ensure learning_outcomes exists and is aligned with goals and learning style
      if (!studyPlanData.learning_outcomes) {
        studyPlanData.learning_outcomes = [
          `Master fundamental concepts of ${formData.subject} through ${formData.learning_style} learning methods`,
          `Apply theoretical knowledge to practical problems related to your goals: ${formData.goals}`,
          `Develop ${formData.learning_style}-specific study skills for ${formData.subject}`
        ];
      }
      
      // Ensure assessment_methods exists and is appropriate for learning style
      if (!studyPlanData.assessment_methods) {
        const assessmentMethods = {
          visual: ['Visual quizzes with diagrams', 'Mind map assessments', 'Video presentations'],
          auditory: ['Oral explanations', 'Podcast summaries', 'Group discussions'],
          reading: ['Written assignments', 'Reading comprehension tests', 'Essay questions'],
          kinesthetic: ['Practical projects', 'Hands-on demonstrations', 'Real-world applications']
        };
        
        studyPlanData.assessment_methods = assessmentMethods[formData.learning_style as keyof typeof assessmentMethods] || [
          'Weekly quizzes',
          'Practical assignments',
          'Final assessment'
        ];
      }
      
      // Ensure tips exists and is tailored to learning style and goals
      if (!studyPlanData.tips) {
        const learningStyleTips = {
          visual: [
            `Create visual diagrams to understand ${formData.subject} concepts`,
            `Use color-coding to organize information related to your goals: ${formData.goals}`,
            `Watch visual tutorials to supplement your learning`
          ],
          auditory: [
            `Record yourself explaining ${formData.subject} concepts`,
            `Join study groups to discuss ${formData.subject} topics related to your goals`,
            `Listen to educational podcasts about ${formData.subject}`
          ],
          reading: [
            `Take detailed notes when studying ${formData.subject}`,
            `Create written summaries of how ${formData.subject} relates to your goals: ${formData.goals}`,
            `Read additional materials to deepen your understanding`
          ],
          kinesthetic: [
            `Apply ${formData.subject} concepts through hands-on activities`,
            `Create physical models related to ${formData.subject} and your goals`,
            `Practice real-world applications of ${formData.subject} concepts`
          ]
        };
        
        studyPlanData.tips = learningStyleTips[formData.learning_style as keyof typeof learningStyleTips] || [
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
          let studyPlanData = JSON.parse(jsonMatch[0]);
          
          // Apply the same validation as above
          if (!studyPlanData.weeks || !Array.isArray(studyPlanData.weeks)) {
            throw new Error('Invalid response format: weeks array is missing');
          }
          
          // Check if we have the correct number of weeks
          if (studyPlanData.weeks.length !== formData.duration_weeks) {
            console.warn(`Expected ${formData.duration_weeks} weeks but got ${studyPlanData.weeks.length}. Adjusting...`);
            
            // If we have too few weeks, extend the plan
            if (studyPlanData.weeks.length < formData.duration_weeks) {
              const lastWeek = studyPlanData.weeks[studyPlanData.weeks.length - 1];
              const additionalWeeksNeeded = formData.duration_weeks - studyPlanData.weeks.length;
              
              for (let i = 0; i < additionalWeeksNeeded; i++) {
                const weekNumber = studyPlanData.weeks.length + 1;
                const newWeek = {
                  week: weekNumber,
                  title: `Week ${weekNumber}: Advanced ${formData.subject} Topics`,
                  topics: [`Advanced Topic ${weekNumber}`, `Practice ${weekNumber}`],
                  objectives: [`Master advanced concepts for week ${weekNumber}`, `Apply knowledge through practice`],
                  estimated_total_hours: hoursPerWeek,
                  tasks: [
                    {
                      id: `task${weekNumber}_1`,
                      title: `Study advanced ${formData.subject} concepts`,
                      description: `Study advanced concepts for week ${weekNumber}`,
                      duration_minutes: formData.daily_hours * 30,
                      completed: false,
                      type: taskTypes[0],
                      resources: [],
                      difficulty: formData.difficulty_level,
                      priority: 'medium'
                    },
                    {
                      id: `task${weekNumber}_2`,
                      title: `Practice ${formData.subject} problems`,
                      description: `Practice problems for week ${weekNumber}`,
                      duration_minutes: formData.daily_hours * 30,
                      completed: false,
                      type: taskTypes[1],
                      resources: [],
                      difficulty: formData.difficulty_level,
                      priority: 'medium'
                    }
                  ]
                };
                studyPlanData.weeks.push(newWeek);
              }
            }
            // If we have too many weeks, truncate the plan
            else if (studyPlanData.weeks.length > formData.duration_weeks) {
              studyPlanData.weeks = studyPlanData.weeks.slice(0, formData.duration_weeks);
            }
          }
          
          // Ensure all required fields are present and adjust task durations
          studyPlanData.weeks = studyPlanData.weeks.map((week: any, index: number) => {
            if (!week.week) week.week = index + 1;
            if (!week.title) week.title = `Week ${index + 1}`;
            if (!week.topics) week.topics = [];
            if (!week.objectives) week.objectives = [];
            if (!week.estimated_total_hours) week.estimated_total_hours = hoursPerWeek;
            if (!week.tasks) week.tasks = [];
            
            // Calculate total minutes for the week based on daily hours
            const totalMinutesForWeek = formData.daily_hours * 60 * 7;
            
            // Ensure all tasks have required fields and adjust durations
            week.tasks = week.tasks.map((task: any, taskIndex: number): StudyTask => {
              // Distribute time evenly among tasks, but ensure each task has a reasonable minimum
              const taskCount = week.tasks.length;
              const minutesPerTask = Math.max(30, Math.floor(totalMinutesForWeek / taskCount));
              
              // Ensure task type is appropriate for learning style
              let taskType: 'reading' | 'video' | 'practice' | 'review' | 'discussion' | 'assessment' | 'project' = task.type || 'reading';
              if (!taskTypes.includes(taskType)) {
                taskType = taskTypes[0];
              }
              
              return {
                id: task.id || `task${index + 1}_${taskIndex + 1}`,
                title: task.title || 'Untitled Task',
                description: task.description || 'No description',
                duration_minutes: task.duration_minutes || minutesPerTask,
                completed: task.completed || false,
                type: taskType,
                resources: task.resources || [],
                difficulty: task.difficulty || formData.difficulty_level,
                priority: task.priority || 'medium'
              };
            });
            
            return week as StudyWeek;
          });
          
          // Search for real resources using SERPApi
          const allTopics = studyPlanData.weeks.flatMap((week: StudyWeek) => week.topics);
          const realResources = await searchForResources(formData.subject, allTopics, formData.difficulty_level, formData.learning_style);
          
          // Ensure resources array exists and has required fields
          if (!studyPlanData.resources) studyPlanData.resources = [];
          
          // Add real resources if we found any
          if (realResources.length > 0) {
            // Add real resources with proper IDs
            const resourcesWithIds = realResources.map((resource, index) => ({
              ...resource,
              id: `real_resource_${index + 1}`
            }));
            
            // Combine existing resources with real ones
            studyPlanData.resources = [...resourcesWithIds, ...studyPlanData.resources];
          }
          
          // If we don't have enough real resources, add placeholder resources
          if (studyPlanData.resources.length < 3) {
            const placeholderResources = [
              {
                id: `placeholder_resource_1`,
                title: `${formData.subject} Textbook for ${formData.learning_style} learners`,
                type: 'book',
                url: 'https://example.com/textbook',
                description: `Comprehensive textbook for ${formData.subject} tailored to ${formData.learning_style} learners at ${formData.difficulty_level} level`,
                verified: false,
                rating: 4.0,
                tags: [formData.subject, 'textbook', formData.learning_style],
                difficulty: formData.difficulty_level
              },
              {
                id: `placeholder_resource_2`,
                title: `${formData.subject} ${formData.learning_style} Video Tutorials`,
                type: 'video',
                url: 'https://example.com/videos',
                description: `Video tutorials covering ${formData.subject} concepts for ${formData.learning_style} learners at ${formData.difficulty_level} level`,
                verified: false,
                rating: 4.0,
                tags: [formData.subject, 'video', 'tutorial', formData.learning_style],
                difficulty: formData.difficulty_level
              }
            ];
            
            studyPlanData.resources = [...studyPlanData.resources, ...placeholderResources];
          }
          
          // Ensure milestones array exists and is aligned with goals
          if (!studyPlanData.milestones) studyPlanData.milestones = [];
          
          // Add milestones based on goals
          if (formData.goals) {
            const goalMilestones = [
              `Complete foundational ${formData.subject} concepts`,
              `Apply ${formData.subject} knowledge to achieve: ${formData.goals}`,
              `Master advanced ${formData.subject} techniques for your goals`
            ];
            studyPlanData.milestones = [...studyPlanData.milestones, ...goalMilestones];
          }
          
          // Ensure overview exists and is personalized
          if (!studyPlanData.overview) {
            studyPlanData.overview = `A comprehensive ${formData.duration_weeks}-week study plan for ${formData.subject} at ${formData.difficulty_level} level, designed specifically for ${formData.learning_style} learners to achieve: ${formData.goals}`;
          }
          
          // Ensure learning_outcomes exists and is aligned with goals and learning style
          if (!studyPlanData.learning_outcomes) {
            studyPlanData.learning_outcomes = [
              `Master fundamental concepts of ${formData.subject} through ${formData.learning_style} learning methods`,
              `Apply theoretical knowledge to practical problems related to your goals: ${formData.goals}`,
              `Develop ${formData.learning_style}-specific study skills for ${formData.subject}`
            ];
          }
          
          // Ensure assessment_methods exists and is appropriate for learning style
          if (!studyPlanData.assessment_methods) {
            const assessmentMethods = {
              visual: ['Visual quizzes with diagrams', 'Mind map assessments', 'Video presentations'],
              auditory: ['Oral explanations', 'Podcast summaries', 'Group discussions'],
              reading: ['Written assignments', 'Reading comprehension tests', 'Essay questions'],
              kinesthetic: ['Practical projects', 'Hands-on demonstrations', 'Real-world applications']
            };
            
            studyPlanData.assessment_methods = assessmentMethods[formData.learning_style as keyof typeof assessmentMethods] || [
              'Weekly quizzes',
              'Practical assignments',
              'Final assessment'
            ];
          }
          
          // Ensure tips exists and is tailored to learning style and goals
          if (!studyPlanData.tips) {
            const learningStyleTips = {
              visual: [
                `Create visual diagrams to understand ${formData.subject} concepts`,
                `Use color-coding to organize information related to your goals: ${formData.goals}`,
                `Watch visual tutorials to supplement your learning`
              ],
              auditory: [
                `Record yourself explaining ${formData.subject} concepts`,
                `Join study groups to discuss ${formData.subject} topics related to your goals`,
                `Listen to educational podcasts about ${formData.subject}`
              ],
              reading: [
                `Take detailed notes when studying ${formData.subject}`,
                `Create written summaries of how ${formData.subject} relates to your goals: ${formData.goals}`,
                `Read additional materials to deepen your understanding`
              ],
              kinesthetic: [
                `Apply ${formData.subject} concepts through hands-on activities`,
                `Create physical models related to ${formData.subject} and your goals`,
                `Practice real-world applications of ${formData.subject} concepts`
              ]
            };
            
            studyPlanData.tips = learningStyleTips[formData.learning_style as keyof typeof learningStyleTips] || [
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
  const topicsPerWeek = Math.max(2, Math.min(5, Math.ceil(10 / formData.duration_weeks))); // Approximate number of topics
  const hoursPerWeek = formData.daily_hours * 7;
  const taskTypes = getTaskTypesForLearningStyle(formData.learning_style);
  
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
      `Apply theoretical knowledge to practical problems related to your goals: ${formData.goals}`
    ];
    
    // Generate tasks with appropriate duration based on daily hours and learning style
    const tasks: StudyTask[] = [];
    
    // First task based on learning style
    tasks.push({
      id: `task${weekNumber}_1`,
      title: `${taskTypes[0] === 'reading' ? 'Read about' : taskTypes[0] === 'video' ? 'Watch videos about' : taskTypes[0] === 'practice' ? 'Practice' : 'Engage with'} ${formData.subject} concepts`,
      description: `${taskTypes[0] === 'reading' ? 'Study the fundamental concepts' : taskTypes[0] === 'video' ? 'Watch tutorials covering' : taskTypes[0] === 'practice' ? 'Practice exercises for' : 'Engage with'} ${formData.subject} for week ${weekNumber}`,
      duration_minutes: formData.daily_hours * 30, // Half of daily time
      completed: false,
      type: taskTypes[0],
      resources: [],
      difficulty: formData.difficulty_level,
      priority: 'medium'
    });
    
    // Second task based on learning style
    tasks.push({
      id: `task${weekNumber}_2`,
      title: `${taskTypes[1] === 'reading' ? 'Read about' : taskTypes[1] === 'video' ? 'Watch videos about' : taskTypes[1] === 'practice' ? 'Practice' : 'Engage with'} ${formData.subject} problems`,
      description: `${taskTypes[1] === 'reading' ? 'Read materials about' : taskTypes[1] === 'video' ? 'Watch tutorials for' : taskTypes[1] === 'practice' ? 'Complete practice problems for' : 'Engage with'} ${formData.subject} for week ${weekNumber}`,
      duration_minutes: formData.daily_hours * 30, // Half of daily time
      completed: false,
      type: taskTypes[1],
      resources: [],
      difficulty: formData.difficulty_level,
      priority: 'medium'
    });
    
    weeks.push({
      week: weekNumber,
      title: weekTitle,
      topics,
      objectives,
      estimated_total_hours: hoursPerWeek,
      tasks
    });
  }
  
  // Generate resources
  const resources: StudyResource[] = [
    {
      id: 'resource1',
      title: `${formData.subject} Textbook for ${formData.learning_style} learners`,
      type: 'book',
      url: 'https://example.com/textbook',
      description: `Comprehensive textbook for ${formData.subject} tailored to ${formData.learning_style} learners at ${formData.difficulty_level} level`,
      verified: false,
      rating: 4.0,
      tags: [formData.subject, 'textbook', formData.learning_style],
      difficulty: formData.difficulty_level
    },
    {
      id: 'resource2',
      title: `${formData.subject} ${formData.learning_style} Video Tutorials`,
      type: 'video',
      url: 'https://example.com/videos',
      description: `Video tutorials covering ${formData.subject} concepts for ${formData.learning_style} learners at ${formData.difficulty_level} level`,
      verified: false,
      rating: 4.0,
      tags: [formData.subject, 'video', 'tutorial', formData.learning_style],
      difficulty: formData.difficulty_level
    }
  ];
  
  // Generate milestones
  const milestones: string[] = [];
  const milestoneInterval = Math.ceil(formData.duration_weeks / 3);
  
  for (let i = 1; i <= 3; i++) {
    const milestoneWeek = Math.min(i * milestoneInterval, formData.duration_weeks);
    milestones.push(`Complete Week ${milestoneWeek} assessment for your goals: ${formData.goals}`);
  }
  
  // Generate overview
  const overview = `A comprehensive ${formData.duration_weeks}-week study plan for ${formData.subject} at ${formData.difficulty_level} level, designed specifically for ${formData.learning_style} learners to achieve: ${formData.goals}`;
  
  // Generate learning outcomes
  const learning_outcomes = [
    `Master fundamental concepts of ${formData.subject} through ${formData.learning_style} learning methods`,
    `Apply theoretical knowledge to practical problems related to your goals: ${formData.goals}`,
    `Develop ${formData.learning_style}-specific study skills for ${formData.subject}`
  ];
  
  // Generate assessment methods based on learning style
  const assessmentMethods = {
    visual: ['Visual quizzes with diagrams', 'Mind map assessments', 'Video presentations'],
    auditory: ['Oral explanations', 'Podcast summaries', 'Group discussions'],
    reading: ['Written assignments', 'Reading comprehension tests', 'Essay questions'],
    kinesthetic: ['Practical projects', 'Hands-on demonstrations', 'Real-world applications']
  };
  
  const assessment_methods = assessmentMethods[formData.learning_style as keyof typeof assessmentMethods] || [
    'Weekly quizzes',
    'Practical assignments',
    'Final assessment'
  ];
  
  // Generate tips based on learning style
  const learningStyleTips = {
    visual: [
      `Create visual diagrams to understand ${formData.subject} concepts`,
      `Use color-coding to organize information related to your goals: ${formData.goals}`,
      `Watch visual tutorials to supplement your learning`
    ],
    auditory: [
      `Record yourself explaining ${formData.subject} concepts`,
      `Join study groups to discuss ${formData.subject} topics related to your goals`,
      `Listen to educational podcasts about ${formData.subject}`
    ],
    reading: [
      `Take detailed notes when studying ${formData.subject}`,
      `Create written summaries of how ${formData.subject} relates to your goals: ${formData.goals}`,
      `Read additional materials to deepen your understanding`
    ],
    kinesthetic: [
      `Apply ${formData.subject} concepts through hands-on activities`,
      `Create physical models related to ${formData.subject} and your goals`,
      `Practice real-world applications of ${formData.subject} concepts`
    ]
  };
  
  const tips = learningStyleTips[formData.learning_style as keyof typeof learningStyleTips] || [
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
    
    const response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
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
    }, API_TIMEOUT);

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
    const response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
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
    }, API_TIMEOUT);

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
    const response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
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
    }, API_TIMEOUT);

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
    const response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
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
    }, API_TIMEOUT);

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
    const response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
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
    }, API_TIMEOUT);

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
  
  // Get learning style specific instructions
  const learningStyleInstructions = getLearningStyleInstructions(learningStyle);
  
  const prompt = `
    Generate 5 additional high-quality educational resources for a student studying ${subject} at ${difficulty} level with a ${learningStyle} learning style.
    
    Topics covered: ${topics.join(', ')}
    Learning Style: ${learningStyle}
    Learning Style Approach: ${learningStyleInstructions}
    
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
    3. Tailored to the ${learningStyle} learning style: ${learningStyleInstructions}
    4. Appropriate for ${difficulty} level students
    5. Varied in type (mix of videos, articles, interactive tools, etc.)
    6. Specifically designed to help with ${learningStyle} learning
    
    Return only valid JSON without any additional text or formatting.
  `;

  try {
    const response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
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
    }, API_TIMEOUT);

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
      let resourcesData = JSON.parse(content);
      
      // Search for real resources using SERPApi
      const realResources = await searchForResources(subject, topics, difficulty, learningStyle);
      
      // Combine real resources with AI-generated ones
      if (realResources.length > 0) {
        // Add real resources with proper IDs
        const resourcesWithIds = realResources.map((resource, index) => ({
          ...resource,
          id: `real_resource_${Date.now()}_${index}`
        }));
        
        // Combine existing resources with real ones
        resourcesData = [...resourcesWithIds, ...resourcesData];
      }
      
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
          tags: [...(resource.tags || []), learningStyle], // Ensure learning style is included in tags
          difficulty: resource.difficulty || difficulty as 'beginner' | 'intermediate' | 'advanced'
        };
      });
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content);
      
      // If parsing fails, try to extract JSON from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          let resourcesData = JSON.parse(jsonMatch[0]);
          
          // Search for real resources using SERPApi
          const realResources = await searchForResources(subject, topics, difficulty, learningStyle);
          
          // Combine real resources with AI-generated ones
          if (realResources.length > 0) {
            // Add real resources with proper IDs
            const resourcesWithIds = realResources.map((resource, index) => ({
              ...resource,
              id: `real_resource_${Date.now()}_${index}`
            }));
            
            // Combine existing resources with real ones
            resourcesData = [...resourcesWithIds, ...resourcesData];
          }
          
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
              tags: [...(resource.tags || []), learningStyle], // Ensure learning style is included in tags
              difficulty: resource.difficulty || difficulty as 'beginner' | 'intermediate' | 'advanced'
            };
          });
        } catch (e) {
          console.error('Failed to parse extracted JSON:', e);
        }
      }
      
      // If all else fails, create a basic resource
      console.warn('Creating fallback resources due to parsing failure');
      return createFallbackResources(subject, difficulty, learningStyle);
    }
  } catch (error) {
    console.error('Error generating resources:', error);
    throw error;
  }
};

// Create fallback resources in case OpenAI fails
const createFallbackResources = (subject: string, difficulty: string, learningStyle: string): StudyResource[] => {
  return [
    {
      id: `fallback_resource_1`,
      title: `${subject} Textbook for ${learningStyle} learners`,
      type: 'book',
      url: 'https://example.com/textbook',
      description: `Comprehensive textbook for ${subject} at ${difficulty} level, specifically designed for ${learningStyle} learners`,
      verified: false,
      rating: 4.0,
      tags: [subject, 'textbook', learningStyle],
      difficulty: difficulty as 'beginner' | 'intermediate' | 'advanced'
    },
    {
      id: `fallback_resource_2`,
      title: `${subject} ${learningStyle} Video Tutorials`,
      type: 'video',
      url: 'https://example.com/videos',
      description: `Video tutorials covering ${subject} concepts at ${difficulty} level, tailored for ${learningStyle} learners`,
      verified: false,
      rating: 4.0,
      tags: [subject, 'video', 'tutorial', learningStyle],
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
  
  // Get learning style specific instructions
  const learningStyleInstructions = getLearningStyleInstructions(learningStyle);
  const taskTypes = getTaskTypesForLearningStyle(learningStyle);
  
  const prompt = `
    Generate 3 additional study tasks for a student studying ${subject} at ${difficulty} level with a ${learningStyle} learning style.
    
    Week: ${weekTitle}
    Topics: ${weekTopics.join(', ')}
    Learning Style: ${learningStyle}
    Learning Style Approach: ${learningStyleInstructions}
    
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
    2. Tailored to the ${learningStyle} learning style: ${learningStyleInstructions}
    3. Appropriate for ${difficulty} level students
    4. Varied in type and difficulty
    5. Practical and achievable
    6. Specifically designed for ${learningStyle} learners
    
    Task types to prioritize: ${taskTypes.join(', ')}
    
    Return only valid JSON without any additional text or formatting.
  `;

  try {
    const response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
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
    }, API_TIMEOUT);

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
      
      // Ensure all tasks have required fields and appropriate types for learning style
      return tasksData.map((task: any): StudyTask => {
        // Ensure task type is appropriate for learning style
        let taskType: 'reading' | 'video' | 'practice' | 'review' | 'discussion' | 'assessment' | 'project' = task.type || 'reading';
        if (!taskTypes.includes(taskType)) {
          taskType = taskTypes[0];
        }
        
        return {
          id: task.id || `task_${Math.random().toString(36).substr(2, 9)}`,
          title: task.title || 'Untitled Task',
          description: task.description || 'No description',
          duration_minutes: task.duration_minutes || 60,
          completed: task.completed || false,
          type: taskType,
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
          
          // Ensure all tasks have required fields and appropriate types for learning style
          return tasksData.map((task: any): StudyTask => {
            // Ensure task type is appropriate for learning style
            let taskType: 'reading' | 'video' | 'practice' | 'review' | 'discussion' | 'assessment' | 'project' = task.type || 'reading';
            if (!taskTypes.includes(taskType)) {
              taskType = taskTypes[0];
            }
            
            return {
              id: task.id || `task_${Math.random().toString(36).substr(2, 9)}`,
              title: task.title || 'Untitled Task',
              description: task.description || 'No description',
              duration_minutes: task.duration_minutes || 60,
              completed: task.completed || false,
              type: taskType,
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
      return createFallbackTasks(subject, difficulty, learningStyle);
    }
  } catch (error) {
    console.error('Error generating tasks:', error);
    throw error;
  }
};

// Create fallback tasks in case OpenAI fails
const createFallbackTasks = (subject: string, difficulty: string, learningStyle: string): StudyTask[] => {
  const taskTypes = getTaskTypesForLearningStyle(learningStyle);
  
  return [
    {
      id: `fallback_task_1`,
      title: `${taskTypes[0] === 'reading' ? 'Review' : taskTypes[0] === 'video' ? 'Watch' : taskTypes[0] === 'practice' ? 'Practice' : 'Engage with'} ${subject} concepts`,
      description: `${taskTypes[0] === 'reading' ? 'Review the key concepts' : taskTypes[0] === 'video' ? 'Watch tutorials covering' : taskTypes[0] === 'practice' ? 'Practice exercises for' : 'Engage with'} ${subject} material, tailored for ${learningStyle} learners`,
      duration_minutes: 60,
      completed: false,
      type: taskTypes[0],
      resources: [],
      difficulty: difficulty as 'beginner' | 'intermediate' | 'advanced',
      priority: 'medium',
      subtasks: [
        {
          id: `fallback_subtask_1`,
          title: `Summarize key points using ${learningStyle} methods`,
          completed: false
        }
      ]
    },
    {
      id: `fallback_task_2`,
      title: `${taskTypes[1] === 'reading' ? 'Read about' : taskTypes[1] === 'video' ? 'Watch videos about' : taskTypes[1] === 'practice' ? 'Practice' : 'Engage with'} ${subject} problems`,
      description: `${taskTypes[1] === 'reading' ? 'Read materials about' : taskTypes[1] === 'video' ? 'Watch tutorials for' : taskTypes[1] === 'practice' ? 'Complete practice problems for' : 'Engage with'} ${subject}, designed for ${learningStyle} learners`,
      duration_minutes: 60,
      completed: false,
      type: taskTypes[1],
      resources: [],
      difficulty: difficulty as 'beginner' | 'intermediate' | 'advanced',
      priority: 'medium',
      subtasks: [
        {
          id: `fallback_subtask_2`,
          title: `Complete 5 problems using ${learningStyle} approach`,
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

  // Get learning style specific instructions
  const learningStyleInstructions = getLearningStyleInstructions(learningStyle);

  const prompt = `
    Generate 5 study tips for a student studying ${subject} at ${difficulty} level with a ${learningStyle} learning style.
    
    Learning Style Approach: ${learningStyleInstructions}
    
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
    2. Tailored to ${learningStyle} learners: ${learningStyleInstructions}
    3. Appropriate for ${difficulty} level students
    4. Actionable and practical
    5. Based on proven learning strategies for ${learningStyle} learners
    
    Return only valid JSON without any additional text or formatting.
  `;

  try {
    const response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
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
    }, API_TIMEOUT);

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
    `Practice active recall by testing yourself on ${subject} concepts`,
    `Teach ${subject} concepts to someone else to reinforce your understanding`,
    `Review material regularly to maintain long-term retention`
  ];
  
  const learningStyleTips: { [key: string]: string[] } = {
    visual: [
      `Use color coding when studying ${subject}`,
      `Create mind maps for ${subject} concepts`,
      `Watch videos about ${subject} to supplement your learning`,
      `Draw diagrams to illustrate ${subject} relationships`,
      `Use visual symbols to represent ${subject} ideas`
    ],
    auditory: [
      `Record yourself explaining ${subject} concepts`,
      `Listen to podcasts about ${subject}`,
      `Discuss ${subject} topics with classmates or friends`,
      `Use mnemonic devices with rhymes or rhythms`,
      `Explain ${subject} concepts out loud to reinforce learning`
    ],
    reading: [
      `Take detailed notes when studying ${subject}`,
      `Rewrite ${subject} concepts in your own words`,
      `Create summaries of ${subject} chapters`,
      `Use highlighters to mark important ${subject} information`,
      `Create flashcards with key ${subject} terms`
    ],
    kinesthetic: [
      `Use hands-on activities to learn ${subject}`,
      `Create physical models related to ${subject}`,
      `Take breaks to move around while studying ${subject}`,
      `Apply ${subject} concepts to real-world situations`,
      `Use manipulatives to understand ${subject} relationships`
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
    const response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
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
    }, API_TIMEOUT);

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

  // Get learning style specific instructions
  const learningStyleInstructions = getLearningStyleInstructions(learningStyle);

  const prompt = `
    Generate a personalized study schedule for a student studying ${subject} at ${difficulty} level with a ${learningStyle} learning style.
    
    Learning Style Approach: ${learningStyleInstructions}
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
              "focus_area": "Topic 1",
              "learning_style_method": "Method appropriate for ${learningStyle} learners"
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
          "activity": "Short break"
        }
      ],
      "productivity_tips": [
        "Tip 1",
        "Tip 2"
      ]
    }
    
    Make sure the schedule is:
    1. Realistic and achievable
    2. Tailored to ${learningStyle} learners: ${learningStyleInstructions}
    3. Optimized for ${preferredTimeOfDay} study sessions
    4. Includes appropriate breaks
    5. Progresses logically based on current progress
    6. Aligned with study goals: ${studyGoals}
    7. Includes specific methods for ${learningStyle} learners
    
    Return only valid JSON without any additional text or formatting.
  `;

  try {
    const response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
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
    }, API_TIMEOUT);

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
      return createFallbackSchedule(subject, availableHours, preferredTimeOfDay, learningStyle);
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
  preferredTimeOfDay: string,
  learningStyle: string
): any => {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const dailySchedule: any[] = [];
  const taskTypes = getTaskTypesForLearningStyle(learningStyle);
  
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
      
      // Alternate between different task types based on learning style
      const taskType = taskTypes[i % taskTypes.length];
      const activity = taskType === 'reading' ? `Read about ${subject}` :
                      taskType === 'video' ? `Watch ${subject} videos` :
                      taskType === 'practice' ? `Practice ${subject} problems` :
                      taskType === 'review' ? `Review ${subject} concepts` :
                      `Study ${subject}`;
      
      sessions.push({
        time: timeString,
        duration_minutes: 60,
        activity: activity,
        focus_area: `Topic ${i + 1}`,
        learning_style_method: `Use ${learningStyle} learning methods`
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
      `Complete ${subject} assignments using ${learningStyle} methods`,
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
      `Use ${learningStyle} specific study techniques`,
      'Take regular breaks to maintain concentration'
    ]
  };
};