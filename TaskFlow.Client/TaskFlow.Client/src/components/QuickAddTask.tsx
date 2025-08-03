import { useState, useEffect, useRef } from 'react';
import { X, Plus, Sparkles } from 'lucide-react';
import { parseTaskInput, type ParsedTask } from '../utils/taskParser';
import { calendarService, type CreateTaskRequest } from '../services/calendarService';
import { projectService, type Project } from '../services/projectService';
import { format } from 'date-fns';

interface QuickAddTaskProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated?: () => void;
}

export default function QuickAddTask({ isOpen, onClose, onTaskCreated }: QuickAddTaskProps) {
  const [input, setInput] = useState('');
  const [parsed, setParsed] = useState<ParsedTask | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Fetch projects when component mounts
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const fetchedProjects = await projectService.getProjects();
        setProjects(fetchedProjects);
      } catch (err) {
        console.error('Error fetching projects:', err);
      }
    };
    fetchProjects();
  }, []);
  
  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setInput('');
      setParsed(null);
      setError(null);
    }
  }, [isOpen]);
  
  // Parse input as user types
  useEffect(() => {
    if (input.trim()) {
      const parsedTask = parseTaskInput(input);
      setParsed(parsedTask);
      
      // Generate suggestions for projects
      if (input.includes('@') && !input.includes(' ', input.lastIndexOf('@'))) {
        const projectPrefix = input.substring(input.lastIndexOf('@') + 1).toLowerCase();
        const projectSuggestions = projects
          .filter(p => p.name.toLowerCase().startsWith(projectPrefix))
          .map(p => p.name);
        setSuggestions(projectSuggestions);
      } else {
        setSuggestions([]);
      }
    } else {
      setParsed(null);
      setSuggestions([]);
    }
  }, [input, projects]);
  
  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!parsed || !parsed.title.trim()) {
      setError('Please enter a task title');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Find project by name if specified
      let projectId: string | undefined;
      if (parsed.projectName) {
        const project = projects.find(p => 
          p.name.toLowerCase() === parsed.projectName?.toLowerCase()
        );
        projectId = project?.id;
      }
      
      // Create task request
      const taskData: CreateTaskRequest = {
        title: parsed.title,
        description: '',
        priority: parsed.priority || 'Medium',
        status: 'Pending',
        dueDate: parsed.dueDate?.toISOString(),
        scheduledTime: parsed.scheduledTime?.toISOString(),
        timeEstimateInMinutes: parsed.timeEstimateInMinutes,
        tags: parsed.tags || [],
        projectId,
      };
      
      await calendarService.createTask(taskData);
      
      // Reset and close
      setInput('');
      setParsed(null);
      onTaskCreated?.();
      onClose();
    } catch (err) {
      console.error('Error creating task:', err);
      setError('Failed to create task. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };
  
  const applySuggestion = (suggestion: string) => {
    const lastAtIndex = input.lastIndexOf('@');
    const newInput = input.substring(0, lastAtIndex + 1) + suggestion + ' ';
    setInput(newInput);
    inputRef.current?.focus();
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 pt-20">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-600" />
              <h2 className="text-lg font-semibold text-gray-900">Quick Add Task</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Try: Meeting with team @project-name tomorrow 2:30pm 1hr !high #planning"
                className="w-full px-4 py-3 pr-10 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                disabled={loading}
              />
              {loading && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
                </div>
              )}
            </div>
            
            {/* Suggestions dropdown */}
            {suggestions.length > 0 && (
              <div className="absolute mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg z-10">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => applySuggestion(suggestion)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
                  >
                    @{suggestion}
                  </button>
                ))}
              </div>
            )}
            
            {/* Parsed preview */}
            {parsed && parsed.title && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-2">Preview:</div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">Title:</span>
                    <span className="text-sm text-gray-900">{parsed.title}</span>
                  </div>
                  
                  {parsed.projectName && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">Project:</span>
                      <span className="text-sm text-indigo-600">@{parsed.projectName}</span>
                    </div>
                  )}
                  
                  <div className="flex flex-wrap gap-4">
                    {parsed.priority && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700">Priority:</span>
                        <span className={`text-sm px-2 py-1 rounded ${
                          parsed.priority === 'Urgent' ? 'bg-red-100 text-red-700' :
                          parsed.priority === 'High' ? 'bg-orange-100 text-orange-700' :
                          parsed.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {parsed.priority}
                        </span>
                      </div>
                    )}
                    
                    {parsed.dueDate && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700">Due:</span>
                        <span className="text-sm text-gray-900">
                          {format(parsed.dueDate, 'MMM d, yyyy')}
                        </span>
                      </div>
                    )}
                    
                    {parsed.scheduledTime && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700">Time:</span>
                        <span className="text-sm text-gray-900">
                          {format(parsed.scheduledTime, 'h:mm a')}
                        </span>
                      </div>
                    )}
                    
                    {parsed.timeEstimateInMinutes && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700">Duration:</span>
                        <span className="text-sm text-gray-900">
                          {parsed.timeEstimateInMinutes >= 60 
                            ? `${Math.floor(parsed.timeEstimateInMinutes / 60)}h ${parsed.timeEstimateInMinutes % 60}m`
                            : `${parsed.timeEstimateInMinutes}m`}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {parsed.tags && parsed.tags.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">Tags:</span>
                      <div className="flex gap-1">
                        {parsed.tags.map((tag, index) => (
                          <span key={index} className="text-sm px-2 py-1 bg-blue-100 text-blue-700 rounded">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div className="mt-4 flex items-center justify-between">
              <div className="text-xs text-gray-500">
                Press <kbd className="px-1.5 py-0.5 bg-gray-100 rounded">Enter</kbd> to create • 
                <kbd className="px-1.5 py-0.5 bg-gray-100 rounded ml-1">Esc</kbd> to cancel
              </div>
              <button
                type="submit"
                disabled={loading || !parsed?.title}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Plus className="h-4 w-4" />
                Create Task
              </button>
            </div>
          </form>
          
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="text-xs text-gray-500">
              <div className="font-semibold mb-1">Syntax Guide:</div>
              <div className="grid grid-cols-2 gap-2">
                <div>• <code>@project</code> - Assign to project</div>
                <div>• <code>!high</code> - Set priority (low/medium/high/urgent)</div>
                <div>• <code>#tag</code> - Add tags</div>
                <div>• <code>2:30pm</code> - Set time</div>
                <div>• <code>1hr</code> or <code>30min</code> - Set duration</div>
                <div>• <code>tomorrow</code>, <code>monday</code> - Set date</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}