import { useState, useEffect } from 'react';
import { Calendar, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import Layout from '../components/Layout';
import KanbanBoard from '../components/KanbanBoard';
import AddTaskModal from '../components/AddTaskModal';
import { calendarService, type TaskDto } from '../services/calendarService';

export default function Today() {
  const [tasks, setTasks] = useState<TaskDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [editTask, setEditTask] = useState<TaskDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const todayTasks = await calendarService.getTodayTasks();
      setTasks(todayTasks);
    } catch (err) {
      console.error('Error fetching today\'s tasks:', err);
      setError('Failed to load tasks. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleTaskStatusChange = async (taskId: string, newStatus: string) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      const updatedTask = await calendarService.updateTask(taskId, {
        title: task.title,
        description: task.description,
        priority: task.priority,
        status: newStatus,
        dueDate: task.dueDate,
        scheduledTime: task.scheduledTime,
        timeEstimateInMinutes: task.timeEstimateInMinutes,
        tags: task.tags,
      });

      setTasks(prevTasks =>
        prevTasks.map(t => (t.id === taskId ? updatedTask : t))
      );
    } catch (err) {
      console.error('Error updating task status:', err);
      setError('Failed to update task status. Please try again.');
    }
  };

  const handleTaskEdit = (task: TaskDto) => {
    setEditTask(task);
    setIsAddTaskModalOpen(true);
  };

  const handleTaskComplete = async (taskId: string) => {
    try {
      const completedTask = await calendarService.completeTask(taskId);
      setTasks(prevTasks =>
        prevTasks.map(t => (t.id === taskId ? completedTask : t))
      );
    } catch (err) {
      console.error('Error completing task:', err);
      setError('Failed to complete task. Please try again.');
    }
  };

  const handleTaskDelete = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    try {
      await calendarService.deleteTask(taskId);
      setTasks(prevTasks => prevTasks.filter(t => t.id !== taskId));
    } catch (err) {
      console.error('Error deleting task:', err);
      setError('Failed to delete task. Please try again.');
    }
  };

  const handleAddTask = () => {
    setEditTask(null);
    setIsAddTaskModalOpen(true);
  };

  const handleTaskSaved = () => {
    fetchTasks();
  };

  const handleCloseModal = () => {
    setIsAddTaskModalOpen(false);
    setEditTask(null);
  };

  return (
    <Layout>
      <div className="p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Calendar className="h-6 w-6 text-indigo-600" />
                <h1 className="text-2xl font-bold text-gray-900">Today</h1>
              </div>
              <p className="text-gray-600">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
            </div>
            <button
              onClick={fetchTasks}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading tasks...</p>
            </div>
          </div>
        ) : (
          <KanbanBoard
            tasks={tasks}
            onTaskStatusChange={handleTaskStatusChange}
            onTaskEdit={handleTaskEdit}
            onTaskComplete={handleTaskComplete}
            onTaskDelete={handleTaskDelete}
            onAddTask={handleAddTask}
          />
        )}

        <AddTaskModal
          isOpen={isAddTaskModalOpen}
          onClose={handleCloseModal}
          selectedDate={new Date()}
          editTask={editTask || undefined}
          onTaskSaved={handleTaskSaved}
        />
      </div>
    </Layout>
  );
}