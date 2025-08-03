import { format, addDays, startOfToday, isValid } from 'date-fns';

export interface ParsedTask {
  title: string;
  projectName?: string;
  dueDate?: Date;
  scheduledTime?: Date;
  timeEstimateInMinutes?: number;
  priority?: 'Low' | 'Medium' | 'High' | 'Urgent';
  tags?: string[];
  assignee?: string;
}

export function parseTaskInput(input: string): ParsedTask {
  let remainingText = input;
  const result: ParsedTask = { title: '' };
  
  // Extract project (@ prefix)
  const projectMatch = remainingText.match(/@(\S+)/);
  if (projectMatch) {
    result.projectName = projectMatch[1];
    remainingText = remainingText.replace(projectMatch[0], '');
  }
  
  // Extract assignee (~ prefix for user assignment)
  const assigneeMatch = remainingText.match(/~(\S+)/);
  if (assigneeMatch) {
    result.assignee = assigneeMatch[1];
    remainingText = remainingText.replace(assigneeMatch[0], '');
  }
  
  // Extract priority (! prefix)
  const priorityMatch = remainingText.match(/!(urgent|high|medium|low)/i);
  if (priorityMatch) {
    const priorityMap: Record<string, 'Low' | 'Medium' | 'High' | 'Urgent'> = {
      'urgent': 'Urgent',
      'high': 'High',
      'medium': 'Medium',
      'low': 'Low'
    };
    result.priority = priorityMap[priorityMatch[1].toLowerCase()];
    remainingText = remainingText.replace(priorityMatch[0], '');
  }
  
  // Extract tags (# prefix)
  const tagMatches = remainingText.match(/#(\S+)/g);
  if (tagMatches) {
    result.tags = tagMatches.map(tag => tag.substring(1));
    tagMatches.forEach(tag => {
      remainingText = remainingText.replace(tag, '');
    });
  }
  
  // Extract time estimate (duration patterns)
  const durationMatch = remainingText.match(/(\d+)\s*(hr?s?|hours?|mins?|minutes?)/i);
  if (durationMatch) {
    const amount = parseInt(durationMatch[1]);
    const unit = durationMatch[2].toLowerCase();
    if (unit.startsWith('h')) {
      result.timeEstimateInMinutes = amount * 60;
    } else {
      result.timeEstimateInMinutes = amount;
    }
    remainingText = remainingText.replace(durationMatch[0], '');
  }
  
  // Extract time (various time formats)
  const timePatterns = [
    /(\d{1,2}):(\d{2})\s*(am|pm)/i,  // 2:30pm
    /(\d{1,2})\s*(am|pm)/i,           // 2pm
    /(\d{1,2}):(\d{2})/,              // 14:30
  ];
  
  let scheduledHour: number | undefined;
  let scheduledMinute: number | undefined;
  
  for (const pattern of timePatterns) {
    const timeMatch = remainingText.match(pattern);
    if (timeMatch) {
      if (pattern === timePatterns[0]) {
        // 2:30pm format
        scheduledHour = parseInt(timeMatch[1]);
        scheduledMinute = parseInt(timeMatch[2]);
        const isPM = timeMatch[3].toLowerCase() === 'pm';
        if (isPM && scheduledHour !== 12) scheduledHour += 12;
        if (!isPM && scheduledHour === 12) scheduledHour = 0;
      } else if (pattern === timePatterns[1]) {
        // 2pm format
        scheduledHour = parseInt(timeMatch[1]);
        scheduledMinute = 0;
        const isPM = timeMatch[2].toLowerCase() === 'pm';
        if (isPM && scheduledHour !== 12) scheduledHour += 12;
        if (!isPM && scheduledHour === 12) scheduledHour = 0;
      } else {
        // 24-hour format
        scheduledHour = parseInt(timeMatch[1]);
        scheduledMinute = parseInt(timeMatch[2]);
      }
      remainingText = remainingText.replace(timeMatch[0], '');
      break;
    }
  }
  
  // Extract date (various date patterns)
  let targetDate: Date | undefined;
  
  // Check for relative dates
  const relativeDateMatch = remainingText.match(/\b(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i);
  if (relativeDateMatch) {
    const relativeDate = relativeDateMatch[1].toLowerCase();
    const today = startOfToday();
    
    if (relativeDate === 'today') {
      targetDate = today;
    } else if (relativeDate === 'tomorrow') {
      targetDate = addDays(today, 1);
    } else {
      // Day of week - find next occurrence
      const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const targetDay = daysOfWeek.indexOf(relativeDate);
      const currentDay = today.getDay();
      let daysToAdd = targetDay - currentDay;
      if (daysToAdd <= 0) daysToAdd += 7; // Next week if day has passed
      targetDate = addDays(today, daysToAdd);
    }
    remainingText = remainingText.replace(relativeDateMatch[0], '');
  }
  
  // Check for specific date formats (MM/DD, MM-DD, etc.)
  const specificDatePatterns = [
    /(\d{1,2})\/(\d{1,2})/,     // MM/DD
    /(\d{1,2})-(\d{1,2})/,       // MM-DD
  ];
  
  if (!targetDate) {
    for (const pattern of specificDatePatterns) {
      const dateMatch = remainingText.match(pattern);
      if (dateMatch) {
        const month = parseInt(dateMatch[1]) - 1; // JavaScript months are 0-indexed
        const day = parseInt(dateMatch[2]);
        const year = new Date().getFullYear();
        const parsedDate = new Date(year, month, day);
        
        // If date is in the past, assume next year
        if (parsedDate < startOfToday()) {
          parsedDate.setFullYear(year + 1);
        }
        
        if (isValid(parsedDate)) {
          targetDate = parsedDate;
          remainingText = remainingText.replace(dateMatch[0], '');
        }
        break;
      }
    }
  }
  
  // Set the date and time
  if (targetDate || scheduledHour !== undefined) {
    const baseDate = targetDate || startOfToday();
    
    if (scheduledHour !== undefined && scheduledMinute !== undefined) {
      const scheduledDate = new Date(baseDate);
      scheduledDate.setHours(scheduledHour, scheduledMinute, 0, 0);
      result.scheduledTime = scheduledDate;
    }
    
    result.dueDate = baseDate;
  }
  
  // Clean up the remaining text to use as title
  result.title = remainingText.trim().replace(/\s+/g, ' ');
  
  // If no priority was specified, set default to Medium
  if (!result.priority) {
    result.priority = 'Medium';
  }
  
  return result;
}

// Helper function to format parsed task for display
export function formatParsedTask(parsed: ParsedTask): string {
  const parts: string[] = [];
  
  if (parsed.title) parts.push(parsed.title);
  if (parsed.projectName) parts.push(`@${parsed.projectName}`);
  if (parsed.priority && parsed.priority !== 'Medium') parts.push(`!${parsed.priority.toLowerCase()}`);
  if (parsed.tags && parsed.tags.length > 0) {
    parts.push(...parsed.tags.map(tag => `#${tag}`));
  }
  if (parsed.scheduledTime) {
    parts.push(format(parsed.scheduledTime, 'h:mma'));
  } else if (parsed.dueDate) {
    parts.push(format(parsed.dueDate, 'MMM d'));
  }
  if (parsed.timeEstimateInMinutes) {
    const hours = Math.floor(parsed.timeEstimateInMinutes / 60);
    const minutes = parsed.timeEstimateInMinutes % 60;
    if (hours > 0 && minutes > 0) {
      parts.push(`${hours}h${minutes}m`);
    } else if (hours > 0) {
      parts.push(`${hours}hr`);
    } else {
      parts.push(`${minutes}min`);
    }
  }
  
  return parts.join(' ');
}