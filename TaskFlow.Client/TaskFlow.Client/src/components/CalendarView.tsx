import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar, Plus } from 'lucide-react';
import { calendarService, type TaskDto } from '../services/calendarService';

interface CalendarViewProps {
  onDateSelect?: (date: Date) => void;
  onTaskClick?: (task: TaskDto) => void;
  onAddTask?: (date: Date) => void;
}

export type CalendarViewType = 'month' | 'week' | 'today';

export default function CalendarView({ onDateSelect, onTaskClick, onAddTask }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<CalendarViewType>('month');
  const [tasks, setTasks] = useState<TaskDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Load tasks based on current view
  useEffect(() => {
    loadTasks();
  }, [currentDate, viewType]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadTasks = async () => {
    setLoading(true);
    try {
      let fetchedTasks: TaskDto[] = [];
      
      switch (viewType) {
        case 'month':
          fetchedTasks = await calendarService.getTasksByMonth(
            currentDate.getFullYear(),
            currentDate.getMonth() + 1
          );
          break;
        case 'week': {
          const weekStart = startOfWeek(currentDate);
          fetchedTasks = await calendarService.getTasksByWeek(weekStart);
          break;
        }
        case 'today':
          fetchedTasks = await calendarService.getTodayTasks();
          break;
      }
      
      setTasks(fetchedTasks);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrevious = () => {
    if (viewType === 'month') {
      setCurrentDate(subMonths(currentDate, 1));
    } else if (viewType === 'week') {
      setCurrentDate(addDays(currentDate, -7));
    } else {
      setCurrentDate(addDays(currentDate, -1));
    }
  };

  const handleNext = () => {
    if (viewType === 'month') {
      setCurrentDate(addMonths(currentDate, 1));
    } else if (viewType === 'week') {
      setCurrentDate(addDays(currentDate, 7));
    } else {
      setCurrentDate(addDays(currentDate, 1));
    }
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    onDateSelect?.(date);
  };

  const handleAddTaskClick = (date: Date) => {
    onAddTask?.(date);
  };

  const getTasksForDate = (date: Date): TaskDto[] => {
    return tasks.filter(task => {
      const taskDate = task.dueDate ? new Date(task.dueDate) : 
                     task.scheduledTime ? new Date(task.scheduledTime) : null;
      return taskDate && isSameDay(taskDate, date);
    });
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority.toLowerCase()) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const dateFormat = "d";
    const rows = [];
    let days = [];
    let day = startDate;

    // Week days header
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      weekDays.push(
        <div key={i} className="p-2 text-center text-sm font-medium text-gray-500">
          {format(addDays(startOfWeek(new Date()), i), 'EEE')}
        </div>
      );
    }

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const cloneDay = day;
        const dayTasks = getTasksForDate(day);
        const isCurrentMonth = isSameMonth(day, monthStart);
        const isSelected = selectedDate && isSameDay(day, selectedDate);
        const isToday = isSameDay(day, new Date());

        days.push(
          <div
            key={day.toString()}
            className={`min-h-[100px] p-1 border border-gray-200 cursor-pointer hover:bg-gray-50 ${
              !isCurrentMonth ? 'bg-gray-100 text-gray-400' : ''
            } ${isSelected ? 'bg-blue-100' : ''} ${isToday ? 'bg-blue-50' : ''}`}
            onClick={() => handleDateClick(cloneDay)}
          >
            <div className="flex justify-between items-center mb-1">
              <span className={`text-sm ${isToday ? 'font-bold text-blue-600' : ''}`}>
                {format(day, dateFormat)}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddTaskClick(cloneDay);
                }}
                className="p-1 rounded hover:bg-gray-200"
              >
                <Plus className="h-3 w-3 text-gray-500" />
              </button>
            </div>
            <div className="space-y-1">
              {dayTasks.slice(0, 3).map((task) => (
                <div
                  key={task.id}
                  className={`text-xs p-1 rounded truncate cursor-pointer text-white ${getPriorityColor(task.priority)}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onTaskClick?.(task);
                  }}
                  title={task.title}
                >
                  {task.title}
                </div>
              ))}
              {dayTasks.length > 3 && (
                <div className="text-xs text-gray-500">+{dayTasks.length - 3} more</div>
              )}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div key={day.toString()} className="grid grid-cols-7">
          {days}
        </div>
      );
      days = [];
    }

    return (
      <div>
        <div className="grid grid-cols-7 bg-gray-50">
          {weekDays}
        </div>
        {rows}
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate);
    const weekDays = [];

    for (let i = 0; i < 7; i++) {
      const day = addDays(weekStart, i);
      const dayTasks = getTasksForDate(day);
      const isToday = isSameDay(day, new Date());
      const isSelected = selectedDate && isSameDay(day, selectedDate);

      weekDays.push(
        <div
          key={day.toString()}
          className={`flex-1 min-h-[400px] p-3 border-r border-gray-200 cursor-pointer hover:bg-gray-50 ${
            isSelected ? 'bg-blue-100' : ''
          } ${isToday ? 'bg-blue-50' : ''}`}
          onClick={() => handleDateClick(day)}
        >
          <div className="flex justify-between items-center mb-3">
            <div>
              <div className="text-xs text-gray-500">{format(day, 'EEE')}</div>
              <div className={`text-lg ${isToday ? 'font-bold text-blue-600' : ''}`}>
                {format(day, 'd')}
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleAddTaskClick(day);
              }}
              className="p-1 rounded hover:bg-gray-200"
            >
              <Plus className="h-4 w-4 text-gray-500" />
            </button>
          </div>
          <div className="space-y-2">
            {dayTasks.map((task) => (
              <div
                key={task.id}
                className={`text-sm p-2 rounded cursor-pointer text-white ${getPriorityColor(task.priority)}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onTaskClick?.(task);
                }}
              >
                <div className="font-medium truncate">{task.title}</div>
                {task.scheduledTime && (
                  <div className="text-xs opacity-90">
                    {format(new Date(task.scheduledTime), 'HH:mm')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    }

    return <div className="flex border border-gray-200">{weekDays}</div>;
  };

  const renderTodayView = () => {
    const today = new Date();
    const todayTasks = getTasksForDate(today);

    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Today</h2>
              <p className="text-gray-600">{format(today, 'EEEE, MMMM d, yyyy')}</p>
            </div>
            <button
              onClick={() => handleAddTaskClick(today)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </button>
          </div>
          
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : todayTasks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No tasks scheduled for today</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayTasks.map((task) => (
                <div
                  key={task.id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => onTaskClick?.(task)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${getPriorityColor(task.priority)}`}></div>
                        <h3 className="font-medium text-gray-900">{task.title}</h3>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          task.status === 'Completed' ? 'bg-green-100 text-green-800' :
                          task.status === 'InProgress' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {task.status}
                        </span>
                      </div>
                      {task.description && (
                        <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                      )}
                      {task.scheduledTime && (
                        <p className="text-sm text-gray-500 mt-1">
                          {format(new Date(task.scheduledTime), 'HH:mm')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const getHeaderTitle = () => {
    switch (viewType) {
      case 'month':
        return format(currentDate, 'MMMM yyyy');
      case 'week': {
        const weekStart = startOfWeek(currentDate);
        const weekEnd = endOfWeek(currentDate);
        return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
      }
      case 'today':
        return format(currentDate, 'EEEE, MMMM d, yyyy');
      default:
        return '';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b border-gray-200">
        {/* Calendar Controls */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-gray-900">{getHeaderTitle()}</h1>
            <div className="flex items-center space-x-1">
              <button
                onClick={handlePrevious}
                className="p-2 rounded hover:bg-gray-100"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={handleNext}
                className="p-2 rounded hover:bg-gray-100"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* View Type Selector */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            {(['today', 'week', 'month'] as CalendarViewType[]).map((type) => (
              <button
                key={type}
                onClick={() => setViewType(type)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  viewType === type
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Calendar Content */}
      <div className={viewType === 'today' ? 'p-4' : ''}>
        {loading && viewType !== 'today' ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {viewType === 'month' && renderMonthView()}
            {viewType === 'week' && renderWeekView()}
            {viewType === 'today' && renderTodayView()}
          </>
        )}
      </div>
    </div>
  );
}