import { useState } from 'react';
import Layout from '../components/Layout';
import CalendarView from '../components/CalendarView';
import AddTaskModal from '../components/AddTaskModal';
import type { TaskDto } from '../services/calendarService';

export default function Dashboard() {

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
    setRefreshKey(prev => prev + 1);
  };

  const handleCloseModal = () => {
    setIsAddTaskModalOpen(false);
    setEditTask(null);
    setSelectedDate(null);
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