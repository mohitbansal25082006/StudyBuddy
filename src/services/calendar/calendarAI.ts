// F:\StudyBuddy\src\services\calendar\calendarAI.ts
// ============================================
// CALENDAR AI SERVICE
// AI-powered calendar features
// ============================================

import OpenAI from 'openai';
import { CalendarEvent, Profile } from '../../types';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
  timeout: 120000, // 2 minutes timeout
});

// Valid event types based on database constraint
const VALID_EVENT_TYPES = ['study_session', 'review', 'exam'] as const;
type ValidEventType = typeof VALID_EVENT_TYPES[number];

// ============================================
// AI SMART SCHEDULE GENERATOR
// ============================================

export interface ScheduleRequest {
  subjects: string[];
  preferredStudyTimes: string[];
  durationDays: number;
  dailyHours: number;
  upcomingDeadlines?: { subject: string; date: string; description: string }[];
  difficultyLevels?: { subject: string; level: string }[];
  avoidTimes?: string[];
}

export interface GeneratedSchedule {
  title: string;
  description: string;
  events: {
    title: string;
    subject: string;
    start_time: string;
    end_time: string;
    description: string;
    event_type: ValidEventType;
  }[];
}

export const generateStudySchedule = async (request: ScheduleRequest): Promise<GeneratedSchedule> => {
  try {
    const { subjects, preferredStudyTimes, durationDays, dailyHours, upcomingDeadlines, difficultyLevels, avoidTimes } = request;
    
    // Get current date for reference
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    
    // Format the request for OpenAI
    const prompt = `
    Generate a ${durationDays}-day study schedule for a student focusing on ${subjects.join(', ')} for ${dailyHours} hours daily.
    
    Student preferences:
    - Preferred study times: ${preferredStudyTimes.join(', ')}
    ${upcomingDeadlines && upcomingDeadlines.length > 0 ? `- Upcoming deadlines: ${upcomingDeadlines.map(d => `${d.subject} on ${d.date} (${d.description})`).join(', ')}` : ''}
    ${difficultyLevels && difficultyLevels.length > 0 ? `- Difficulty levels: ${difficultyLevels.map(d => `${d.subject} (${d.level})`).join(', ')}` : ''}
    ${avoidTimes && avoidTimes.length > 0 ? `- Times to avoid: ${avoidTimes.join(', ')}` : ''}
    
    IMPORTANT: All dates should be starting from today (${todayString}) and going forward. Do not use past dates.
    
    Please generate a detailed schedule with the following format:
    1. A title for the schedule
    2. A brief description of the schedule
    3. A list of events with:
       - Title (specific and engaging)
       - Subject
       - Start time (YYYY-MM-DDTHH:MM:SS, starting from today)
       - End time (YYYY-MM-DDTHH:MM:SS, starting from today)
       - Description (what to study)
       - Event type (only use: study_session, review, or exam)
    
    Make sure to:
    - Distribute study time evenly across subjects
    - Include review sessions
    - Schedule breaks
    - Avoid the specified times
    - Account for upcoming deadlines by allocating more time to those subjects
    - Make the schedule realistic and achievable
    - USE CURRENT DATES STARTING FROM TODAY (${todayString})
    - ONLY USE VALID EVENT TYPES: study_session, review, or exam
    
    Return the response in valid JSON format with the following structure:
    {
      "title": "Schedule Title",
      "description": "Brief description",
      "events": [
        {
          "title": "Event Title",
          "subject": "Subject Name",
          "start_time": "YYYY-MM-DDTHH:MM:SS",
          "end_time": "YYYY-MM-DDTHH:MM:SS",
          "description": "What to study",
          "event_type": "study_session"
        }
      ]
    }
    `;
    
    const completion = await openai.chat.completions.create(
      {
        model: "gpt-4",
        messages: [
          { role: "system", content: "You are a helpful assistant that generates study schedules for students. Always respond with valid JSON format." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
      },
      {
        timeout: 120000, // 2 minutes timeout
      }
    );
    
    const responseContent = completion.choices[0].message.content;
    if (!responseContent) {
      throw new Error('No response from OpenAI');
    }
    
    // Try to parse the JSON response
    try {
      // Extract JSON from the response if it contains extra text
      const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      const schedule = JSON.parse(jsonMatch[0]) as GeneratedSchedule;
      
      // Validate and fix dates and event types if needed
      const today = new Date();
      schedule.events = schedule.events.map((event, index) => {
        let startTime = new Date(event.start_time);
        let endTime = new Date(event.end_time);
        
        // If the date is in the past, update it to a future date
        if (startTime < today) {
          const daysToAdd = index + 1; // Spread events over future days
          startTime = new Date(today);
          startTime.setDate(today.getDate() + daysToAdd);
          
          endTime = new Date(startTime);
          endTime.setHours(startTime.getHours() + 2); // 2-hour sessions by default
          
          event.start_time = startTime.toISOString();
          event.end_time = endTime.toISOString();
        }
        
        // Validate event type
        if (!VALID_EVENT_TYPES.includes(event.event_type)) {
          console.warn(`Invalid event type: ${event.event_type}, defaulting to 'study_session'`);
          event.event_type = 'study_session';
        }
        
        return event;
      });
      
      return schedule;
    } catch (parseError) {
      console.error('Error parsing JSON response:', parseError);
      console.error('Response content:', responseContent);
      throw new Error('Failed to parse AI response as JSON');
    }
  } catch (error) {
    console.error('Error generating study schedule:', error);
    throw error;
  }
};

// ============================================
// AI REMINDER TEXT GENERATOR
// ============================================

export interface ReminderRequest {
  userName: string;
  subject: string;
  topic: string;
  progress: number; // 0-100
  streak: number;
  studyTime: number; // minutes
  reminderType: 'motivational' | 'contextual' | 'break' | 'deadline';
}

export const generateReminderText = async (request: ReminderRequest): Promise<string> => {
  try {
    const { userName, subject, topic, progress, streak, studyTime, reminderType } = request;
    
    let prompt = '';
    
    switch (reminderType) {
      case 'motivational':
        prompt = `
        Generate a motivational study reminder for ${userName} who is studying ${subject}.
        
        Context:
        - Current topic: ${topic}
        - Progress: ${progress}% complete
        - Current streak: ${streak} days
        - Total study time today: ${studyTime} minutes
        
        The reminder should be:
        - Encouraging and positive
        - Personalized with their name
        - Reference their current progress or streak
        - Short and concise (under 100 characters)
        - Include an emoji that matches the tone
        
        Examples:
        "Hey ${userName}, you're ${progress}% through ${subject}! Keep going! 🚀"
        "Great job on your ${streak}-day streak! Time for ${subject}! 💪"
        `;
        break;
        
      case 'contextual':
        prompt = `
        Generate a contextual study reminder for ${userName} who is studying ${subject}.
        
        Context:
        - Current topic: ${topic}
        - Progress: ${progress}% complete
        - Current streak: ${streak} days
        - Total study time today: ${studyTime} minutes
        
        The reminder should be:
        - Informative about what to study
        - Personalized with their name
        - Reference their current topic
        - Short and concise (under 100 characters)
        - Include an emoji that matches the subject
        
        Examples:
        "Hey ${userName}, it's ${subject} time! Let's tackle ${topic} today! 📚"
        "Time to continue studying ${topic} in ${subject}, ${userName}! 🧠"
        `;
        break;
        
      case 'break':
        prompt = `
        Generate a break reminder for ${userName} who has been studying ${subject}.
        
        Context:
        - Current topic: ${topic}
        - Progress: ${progress}% complete
        - Current streak: ${streak} days
        - Total study time today: ${studyTime} minutes
        
        The reminder should be:
        - Encouraging them to take a break
        - Acknowledge their hard work
        - Suggest a brief break activity
        - Short and concise (under 100 characters)
        - Include a relaxing emoji
        
        Examples:
        "Great work on ${subject}, ${userName}! Time for a 5-min break! ☕"
        "You've been studying ${subject} for ${studyTime} mins. Stretch a bit! 🧘"
        `;
        break;
        
      case 'deadline':
        prompt = `
        Generate a deadline reminder for ${userName} who is studying ${subject}.
        
        Context:
        - Current topic: ${topic}
        - Progress: ${progress}% complete
        - Current streak: ${streak} days
        - Total study time today: ${studyTime} minutes
        
        The reminder should be:
        - Urgent but not stressful
        - Personalized with their name
        - Reference the upcoming deadline
        - Short and concise (under 100 characters)
        - Include an emoji that conveys urgency
        
        Examples:
        "Hey ${userName}, deadline approaching! Focus on ${subject} today! ⏰"
        "${streak} days strong! Let's finish ${subject} before the deadline! 🎯"
        `;
        break;
    }
    
    const completion = await openai.chat.completions.create(
      {
        model: "gpt-4",
        messages: [
          { role: "system", content: "You are a helpful assistant that generates study reminders for students." },
          { role: "user", content: prompt }
        ],
        temperature: 0.8,
        max_tokens: 100,
      },
      {
        timeout: 120000, // 2 minutes timeout
      }
    );
    
    const responseContent = completion.choices[0].message.content;
    if (!responseContent) {
      throw new Error('No response from OpenAI');
    }
    
    return responseContent.trim();
  } catch (error) {
    console.error('Error generating reminder text:', error);
    throw error;
  }
};

// ============================================
// AI GOAL-TO-SCHEDULE CONVERTER
// ============================================

export interface GoalRequest {
  goal: string;
  subject: string;
  deadline: string;
  availableDays: string[]; // Days of the week available
  availableTimes: string[]; // Time slots available
  sessionDuration: number; // Minutes per session
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export interface ConvertedSchedule {
  title: string;
  description: string;
  events: {
    title: string;
    subject: string;
    start_time: string;
    end_time: string;
    description: string;
    event_type: ValidEventType;
  }[];
}

export const convertGoalToSchedule = async (request: GoalRequest): Promise<ConvertedSchedule> => {
  try {
    const { goal, subject, deadline, availableDays, availableTimes, sessionDuration, difficulty } = request;
    
    // Calculate days until deadline
    const deadlineDate = new Date(deadline);
    const today = new Date();
    const daysUntilDeadline = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    // Get current date for reference
    const todayString = today.toISOString().split('T')[0];
    
    // Format the request for OpenAI
    const prompt = `
    Convert the following goal into a study schedule:
    
    Goal: "${goal}"
    Subject: ${subject}
    Deadline: ${deadline} (${daysUntilDeadline} days from now)
    Available days: ${availableDays.join(', ')}
    Available times: ${availableTimes.join(', ')}
    Session duration: ${sessionDuration} minutes
    Difficulty level: ${difficulty}
    
    IMPORTANT: All dates should be starting from today (${todayString}) and going forward. Do not use past dates.
    
    Please create a schedule that breaks down the goal into manageable study sessions.
    
    Return the response in valid JSON format with the following structure:
    {
      "title": "Schedule Title",
      "description": "Brief description of how this schedule helps achieve the goal",
      "events": [
        {
          "title": "Event Title",
          "subject": "Subject Name",
          "start_time": "YYYY-MM-DDTHH:MM:SS",
          "end_time": "YYYY-MM-DDTHH:MM:SS",
          "description": "What to study in this session",
          "event_type": "study_session"
        }
      ]
    }
    
    Make sure to:
    - Distribute study sessions evenly across available days
    - Break down the goal into logical subtopics
    - Include review sessions
    - Schedule the final review close to the deadline
    - Make the schedule realistic and achievable
    - Start from today's date (${todayString})
    - USE CURRENT DATES STARTING FROM TODAY
    - ONLY USE VALID EVENT TYPES: study_session, review, or exam
    
    Return the response in valid JSON format with the following structure:
    {
      "title": "Schedule Title",
      "description": "Brief description of how this schedule helps achieve the goal",
      "events": [
        {
          "title": "Event Title",
          "subject": "Subject Name",
          "start_time": "YYYY-MM-DDTHH:MM:SS",
          "end_time": "YYYY-MM-DDTHH:MM:SS",
          "description": "What to study in this session",
          "event_type": "study_session"
        }
      ]
    }
    `;
    
    const completion = await openai.chat.completions.create(
      {
        model: "gpt-4",
        messages: [
          { role: "system", content: "You are a helpful assistant that converts study goals into schedules. Always respond with valid JSON format." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
      },
      {
        timeout: 120000, // 2 minutes timeout
      }
    );
    
    const responseContent = completion.choices[0].message.content;
    if (!responseContent) {
      throw new Error('No response from OpenAI');
    }
    
    // Try to parse the JSON response
    try {
      // Extract JSON from the response if it contains extra text
      const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      const schedule = JSON.parse(jsonMatch[0]) as ConvertedSchedule;
      
      // Validate and fix dates and event types if needed
      const today = new Date();
      schedule.events = schedule.events.map((event, index) => {
        let startTime = new Date(event.start_time);
        let endTime = new Date(event.end_time);
        
        // If the date is in the past, update it to a future date
        if (startTime < today) {
          const daysToAdd = index + 1; // Spread events over future days
          startTime = new Date(today);
          startTime.setDate(today.getDate() + daysToAdd);
          
          endTime = new Date(startTime);
          endTime.setMinutes(startTime.getMinutes() + sessionDuration);
          
          event.start_time = startTime.toISOString();
          event.end_time = endTime.toISOString();
        }
        
        // Validate event type
        if (!VALID_EVENT_TYPES.includes(event.event_type)) {
          console.warn(`Invalid event type: ${event.event_type}, defaulting to 'study_session'`);
          event.event_type = 'study_session';
        }
        
        return event;
      });
      
      return schedule;
    } catch (parseError) {
      console.error('Error parsing JSON response:', parseError);
      console.error('Response content:', responseContent);
      throw new Error('Failed to parse AI response as JSON');
    }
  } catch (error) {
    console.error('Error converting goal to schedule:', error);
    throw error;
  }
};

// ============================================
// AI WEEKLY SUMMARY
// ============================================

export interface WeeklySummaryRequest {
  userName: string;
  weekStart: string; // YYYY-MM-DD
  weekEnd: string; // YYYY-MM-DD
  studySessions: {
    subject: string;
    duration: number; // minutes
    date: string; // YYYY-MM-DD
    completed: boolean;
  }[];
  flashcardReviews: {
    subject: string;
    correct: number;
    incorrect: number;
    date: string; // YYYY-MM-DD
  }[];
  goals: {
    goal: string;
    completed: boolean;
    subject: string;
  }[];
}

export interface WeeklySummary {
  title: string;
  overview: string;
  stats: {
    totalStudyTime: number; // minutes
    totalSessions: number;
    successRate: number; // percentage
    mostStudiedSubject: string;
    leastStudiedSubject: string;
    streak: number;
  };
  achievements: string[];
  recommendations: string[];
  nextWeekFocus: string[];
}

export const generateWeeklySummary = async (request: WeeklySummaryRequest): Promise<WeeklySummary> => {
  try {
    const { userName, weekStart, weekEnd, studySessions, flashcardReviews, goals } = request;
    
    // Calculate stats
    const totalStudyTime = studySessions.reduce((sum, session) => sum + session.duration, 0);
    const totalSessions = studySessions.length;
    const completedSessions = studySessions.filter(session => session.completed).length;
    const successRate = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;
    
    // Calculate subject stats
    const subjectTimeMap: { [key: string]: number } = {};
    studySessions.forEach(session => {
      if (!subjectTimeMap[session.subject]) {
        subjectTimeMap[session.subject] = 0;
      }
      subjectTimeMap[session.subject] += session.duration;
    });
    
    const subjects = Object.keys(subjectTimeMap);
    const mostStudiedSubject = subjects.length > 0 
      ? subjects.reduce((a, b) => subjectTimeMap[a] > subjectTimeMap[b] ? a : b)
      : 'None';
    const leastStudiedSubject = subjects.length > 0
      ? subjects.reduce((a, b) => subjectTimeMap[a] < subjectTimeMap[b] ? a : b)
      : 'None';
    
    // Calculate streak
    const studyDates = [...new Set(studySessions.map(session => session.date))].sort();
    let streak = 0;
    if (studyDates.length > 0) {
      streak = 1;
      for (let i = studyDates.length - 1; i > 0; i--) {
        const currentDate = new Date(studyDates[i]);
        const prevDate = new Date(studyDates[i - 1]);
        const diffTime = Math.abs(currentDate.getTime() - prevDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          streak++;
        } else {
          break;
        }
      }
    }
    
    // Format the request for OpenAI
    const prompt = `
    Generate a weekly study summary for ${userName} for the week of ${weekStart} to ${weekEnd}.
    
    Study Statistics:
    - Total study time: ${totalStudyTime} minutes (${Math.round(totalStudyTime / 60)} hours)
    - Total study sessions: ${totalSessions}
    - Success rate: ${successRate}%
    - Most studied subject: ${mostStudiedSubject}
    - Least studied subject: ${leastStudiedSubject}
    - Current streak: ${streak} days
    
    Study Sessions:
    ${studySessions.map(session => `- ${session.subject}: ${session.duration} minutes on ${session.date} (${session.completed ? 'completed' : 'not completed'})`).join('\n')}
    
    Flashcard Reviews:
    ${flashcardReviews.map(review => `- ${review.subject}: ${review.correct} correct, ${review.incorrect} incorrect on ${review.date}`).join('\n')}
    
    Goals:
    ${goals.map(goal => `- ${goal.goal} for ${goal.subject} (${goal.completed ? 'completed' : 'not completed'})`).join('\n')}
    
    Please generate a comprehensive weekly summary with the following format:
    
    1. A title for the summary
    2. An overview paragraph (2-3 sentences)
    3. Key statistics (already calculated)
    4. 3-5 achievements for the week
    5. 3-5 recommendations for improvement
    6. 3-5 focus areas for next week
    
    Return the response in valid JSON format with the following structure:
    {
      "title": "Summary Title",
      "overview": "Brief overview of the week",
      "stats": {
        "totalStudyTime": ${totalStudyTime},
        "totalSessions": ${totalSessions},
        "successRate": ${successRate},
        "mostStudiedSubject": "${mostStudiedSubject}",
        "leastStudiedSubject": "${leastStudiedSubject}",
        "streak": ${streak}
      },
      "achievements": ["Achievement 1", "Achievement 2", "Achievement 3"],
      "recommendations": ["Recommendation 1", "Recommendation 2", "Recommendation 3"],
      "nextWeekFocus": ["Focus 1", "Focus 2", "Focus 3"]
    }
    
    Make sure to:
    - Be encouraging and positive
    - Personalize with the user's name
    - Highlight accomplishments
    - Provide actionable recommendations
    - Keep the language simple and clear
    `;
    
    const completion = await openai.chat.completions.create(
      {
        model: "gpt-4",
        messages: [
          { role: "system", content: "You are a helpful assistant that generates weekly study summaries for students. Always respond with valid JSON format." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
      },
      {
        timeout: 120000, // 2 minutes timeout
      }
    );
    
    const responseContent = completion.choices[0].message.content;
    if (!responseContent) {
      throw new Error('No response from OpenAI');
    }
    
    // Try to parse the JSON response
    try {
      // Extract JSON from the response if it contains extra text
      const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      return JSON.parse(jsonMatch[0]) as WeeklySummary;
    } catch (parseError) {
      console.error('Error parsing JSON response:', parseError);
      console.error('Response content:', responseContent);
      throw new Error('Failed to parse AI response as JSON');
    }
  } catch (error) {
    console.error('Error generating weekly summary:', error);
    throw error;
  }
};
