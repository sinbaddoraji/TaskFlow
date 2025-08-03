import { useState } from 'react';
import Layout from '../components/Layout';
import CalendarView from '../components/CalendarView';
import AddTaskModal from '../components/AddTaskModal';
import type { TaskDto } from '../services/calendarService';
import { useAuth } from '../hooks/useAuth';
import { calendarService } from '../services/calendarService';

export default function Dashboard() {
  const { user } = useAuth();
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [editTask, setEditTask] = useState<TaskDto | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  const handleAddTask = (date: Date) => {
    setSelectedDate(date);
    setEditTask(null);
    setIsAddTaskModalOpen(true);
  };

  const handleTaskClick = (task: TaskDto) => {
    setEditTask(task);
    setSelectedDate(null);
    setIsAddTaskModalOpen(true);
  };

  const handleTaskSaved = () => {
    // Force a complete refresh of the CalendarView component
    // This ensures tasks are reloaded from the server after any changes
    setRefreshKey(prev => prev + 1);
  };

  const handleCloseModal = () => {
    setIsAddTaskModalOpen(false);
    setEditTask(null);
    setSelectedDate(null);
  };

  // New handlers for subtask/comment functionality
  const handleTaskUpdate = () => {
    // Force calendar refresh to show updated task
    setRefreshKey(prev => prev + 1);
  };

  const handleTaskComplete = async (taskId: string) => {
    try {
      await calendarService.completeTask(taskId);
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  const handleTaskDelete = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    try {
      await calendarService.deleteTask(taskId);
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };


  return (
    <Layout>
      <div className="p-6">
        <div className="px-4 py-6 sm:px-0">

          {/* Calendar Section */}
          <div key={refreshKey}>
            <CalendarView
              onDateSelect={handleDateSelect}
              onTaskClick={handleTaskClick}
              onAddTask={handleAddTask}
              onTaskUpdate={handleTaskUpdate}
              onTaskComplete={handleTaskComplete}
              onTaskDelete={handleTaskDelete}
              currentUserId={user?.id}
            />
          </div>

          {/* Add/Edit Task Modal */}
          <AddTaskModal
            isOpen={isAddTaskModalOpen}
            onClose={handleCloseModal}
            selectedDate={selectedDate || undefined}
            editTask={editTask || undefined}
            onTaskSaved={handleTaskSaved}
          />
        </div>
      </div>
    </Layout>
  );
}