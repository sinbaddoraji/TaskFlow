import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Search, 
  Filter, 
  SortAsc, 
  SortDesc, 
  Plus, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight,
  CheckSquare,
  Square,
  Edit,
  Trash2,
  Calendar,
  Clock,
  Tag,
  Briefcase
} from 'lucide-react';
import { format } from 'date-fns';
import Layout from '../components/Layout';
import AddTaskModal from '../components/AddTaskModal';
import { taskService, type TaskQueryParams } from '../services/taskService';
import { type TaskDto } from '../services/calendarService';
type SortField = 'title' | 'dueDate' | 'priority' | 'status' | 'createdAt' | 'updatedAt';
type SortDirection = 'asc' | 'desc';

interface TaskFilters {
  status?: string;
  priority?: string;
  projectId?: string;
  tags?: string[];
  search?: string;
}

export default function AllTasks() {
  const [tasks, setTasks] = useState<TaskDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [editTask, setEditTask] = useState<TaskDto | null>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [tasksPerPage] = useState(20);
  
  // Sorting
  const [sortField, setSortField] = useState<SortField>('updatedAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  // Filtering
  const [filters, setFilters] = useState<TaskFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  
  // Search
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const queryParams: TaskQueryParams = {
        ...filters,
        search: debouncedSearchTerm || undefined,
        page: 1, // Reset to first page when filtering
        pageSize: 1000, // Get all tasks for client-side sorting/pagination
      };
      
      const fetchedTasks = await taskService.getTasks(queryParams);
      setTasks(Array.isArray(fetchedTasks) ? fetchedTasks : []);
      setCurrentPage(1); // Reset to first page
    } catch (err) {
      console.error('Error fetching tasks:', err);
      
      let errorMessage = 'Failed to load tasks. Please try again.';
      if (err instanceof Error) {
        errorMessage = `Failed to load tasks: ${err.message}`;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [filters, debouncedSearchTerm]);

  // Fetch tasks when filters or search change
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Sort and paginate tasks
  const sortedAndPaginatedTasks = useMemo(() => {
    if (!tasks || !Array.isArray(tasks)) {
      return {
        tasks: [],
        totalTasks: 0,
        totalPages: 0,
      };
    }
    
    const sortedTasks = [...tasks];
    
    // Sort tasks
    sortedTasks.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;
      
      switch (sortField) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'dueDate':
          aValue = a.dueDate ? new Date(a.dueDate).getTime() : 0;
          bValue = b.dueDate ? new Date(b.dueDate).getTime() : 0;
          break;
        case 'priority': {
          const priorityOrder = { 'Urgent': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
          aValue = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
          bValue = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
          break;
        }
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case 'updatedAt':
          aValue = new Date(a.updatedAt).getTime();
          bValue = new Date(b.updatedAt).getTime();
          break;
        default:
          return 0;
      }
      
      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
    
    // Paginate
    const startIndex = (currentPage - 1) * tasksPerPage;
    const endIndex = startIndex + tasksPerPage;
    
    return {
      tasks: sortedTasks.slice(startIndex, endIndex),
      totalTasks: sortedTasks.length,
      totalPages: Math.ceil(sortedTasks.length / tasksPerPage),
    };
  }, [tasks, sortField, sortDirection, currentPage, tasksPerPage]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleTaskSelect = (taskId: string) => {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedTasks(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedTasks.size === sortedAndPaginatedTasks.tasks.length) {
      setSelectedTasks(new Set());
    } else {
      setSelectedTasks(new Set(sortedAndPaginatedTasks.tasks.map(task => task.id)));
    }
  };

  const handleTaskEdit = (task: TaskDto) => {
    setEditTask(task);
    setIsAddTaskModalOpen(true);
  };

  const handleTaskDelete = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    try {
      await taskService.deleteTask(taskId);
      setTasks(prevTasks => prevTasks.filter(t => t.id !== taskId));
      setSelectedTasks(prev => {
        const newSet = new Set(prev);
        newSet.delete(taskId);
        return newSet;
      });
    } catch (err) {
      console.error('Error deleting task:', err);
      
      let errorMessage = 'Failed to delete task. Please try again.';
      if (err instanceof Error) {
        errorMessage = `Failed to delete task: ${err.message}`;
      }
      
      setError(errorMessage);
    }
  };

  const handleTaskStatusChange = async (taskId: string, newStatus: string) => {
    try {
      const updatedTask = await taskService.updateTaskStatus(taskId, newStatus);
      setTasks(prevTasks =>
        prevTasks.map(t => (t.id === taskId ? updatedTask : t))
      );
    } catch (err) {
      console.error('Error updating task status:', err);
      
      let errorMessage = 'Failed to update task status. Please try again.';
      if (err instanceof Error) {
        errorMessage = `Failed to update task status: ${err.message}`;
      }
      
      setError(errorMessage);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTasks.size === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedTasks.size} selected tasks?`)) return;
    
    try {
      await Promise.all([...selectedTasks].map(taskId => taskService.deleteTask(taskId)));
      setTasks(prevTasks => prevTasks.filter(t => !selectedTasks.has(t.id)));
      setSelectedTasks(new Set());
    } catch (err) {
      console.error('Error deleting tasks:', err);
      setError('Failed to delete some tasks. Please try again.');
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Urgent': return 'text-red-600 bg-red-50';
      case 'High': return 'text-orange-600 bg-orange-50';
      case 'Medium': return 'text-yellow-600 bg-yellow-50';
      case 'Low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'text-green-600 bg-green-50';
      case 'InProgress': return 'text-blue-600 bg-blue-50';
      case 'Pending': return 'text-gray-600 bg-gray-50';
      case 'OnHold': return 'text-yellow-600 bg-yellow-50';
      case 'Cancelled': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <Layout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">All Tasks</h1>
              <p className="text-gray-600">
                {sortedAndPaginatedTasks.totalTasks} tasks total
                {selectedTasks.size > 0 && ` • ${selectedTasks.size} selected`}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors ${
                  showFilters ? 'bg-gray-50 border-gray-400' : 'border-gray-300'
                }`}
              >
                <Filter className="h-4 w-4" />
                Filters
              </button>
              <button
                onClick={fetchTasks}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
              <button
                onClick={handleAddTask}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Task
              </button>
            </div>
          </div>

          {/* Search and Bulk Actions */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            
            {selectedTasks.size > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleBulkDelete}
                  className="flex items-center gap-2 px-3 py-2 text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Selected ({selectedTasks.size})
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filters.status || ''}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="InProgress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="OnHold">On Hold</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={filters.priority || ''}
                  onChange={(e) => setFilters({ ...filters, priority: e.target.value || undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All Priorities</option>
                  <option value="Urgent">Urgent</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
              
              <div className="md:col-span-3 lg:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Actions</label>
                <button
                  onClick={() => setFilters({})}
                  className="w-full px-3 py-2 text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-2 text-red-600 hover:text-red-800"
            >
              ×
            </button>
          </div>
        )}

        {/* Tasks Table */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading tasks...</p>
            </div>
          </div>
        ) : sortedAndPaginatedTasks.tasks.length === 0 ? (
          <div className="text-center py-12">
            <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || Object.keys(filters).length > 0
                ? 'Try adjusting your search or filters'
                : 'Get started by creating your first task'
              }
            </p>
            <button
              onClick={handleAddTask}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Task
            </button>
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="bg-white rounded-lg border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        <button
                          onClick={handleSelectAll}
                          className="flex items-center justify-center w-5 h-5"
                        >
                          {selectedTasks.size === sortedAndPaginatedTasks.tasks.length ? (
                            <CheckSquare className="h-4 w-4 text-indigo-600" />
                          ) : (
                            <Square className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left">
                        <button
                          onClick={() => handleSort('title')}
                          className="flex items-center gap-1 font-medium text-gray-900 hover:text-indigo-600"
                        >
                          Task
                          {sortField === 'title' && (
                            sortDirection === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />
                          )}
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left">
                        <button
                          onClick={() => handleSort('status')}
                          className="flex items-center gap-1 font-medium text-gray-900 hover:text-indigo-600"
                        >
                          Status
                          {sortField === 'status' && (
                            sortDirection === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />
                          )}
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left">
                        <button
                          onClick={() => handleSort('priority')}
                          className="flex items-center gap-1 font-medium text-gray-900 hover:text-indigo-600"
                        >
                          Priority
                          {sortField === 'priority' && (
                            sortDirection === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />
                          )}
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left">
                        <button
                          onClick={() => handleSort('dueDate')}
                          className="flex items-center gap-1 font-medium text-gray-900 hover:text-indigo-600"
                        >
                          Due Date
                          {sortField === 'dueDate' && (
                            sortDirection === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />
                          )}
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left">Project</th>
                      <th className="px-4 py-3 text-left">
                        <button
                          onClick={() => handleSort('updatedAt')}
                          className="flex items-center gap-1 font-medium text-gray-900 hover:text-indigo-600"
                        >
                          Updated
                          {sortField === 'updatedAt' && (
                            sortDirection === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />
                          )}
                        </button>
                      </th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {sortedAndPaginatedTasks.tasks.map((task) => (
                      <tr key={task.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleTaskSelect(task.id)}
                            className="flex items-center justify-center w-5 h-5"
                          >
                            {selectedTasks.has(task.id) ? (
                              <CheckSquare className="h-4 w-4 text-indigo-600" />
                            ) : (
                              <Square className="h-4 w-4 text-gray-400" />
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <div className="font-medium text-gray-900">{task.title}</div>
                            {task.description && (
                              <div className="text-sm text-gray-500 truncate max-w-xs">
                                {task.description}
                              </div>
                            )}
                            {task.tags.length > 0 && (
                              <div className="flex items-center gap-1 mt-1">
                                <Tag className="h-3 w-3 text-gray-400" />
                                <div className="flex gap-1">
                                  {task.tags.slice(0, 2).map((tag, index) => (
                                    <span
                                      key={index}
                                      className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                  {task.tags.length > 2 && (
                                    <span className="text-xs text-gray-500">
                                      +{task.tags.length - 2}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={task.status}
                            onChange={(e) => handleTaskStatusChange(task.id, e.target.value)}
                            className={`px-2 py-1 text-xs font-medium rounded-full border-0 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${getStatusColor(task.status)}`}
                          >
                            <option value="Pending">Pending</option>
                            <option value="InProgress">In Progress</option>
                            <option value="Completed">Completed</option>
                            <option value="OnHold">On Hold</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {task.dueDate ? (
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(task.dueDate), 'MMM d, yyyy')}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">No due date</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {task.projectName ? (
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                              <Briefcase className="h-3 w-3" />
                              {task.projectName}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">No project</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <Clock className="h-3 w-3" />
                            {format(new Date(task.updatedAt), 'MMM d')}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleTaskEdit(task)}
                              className="p-1 text-gray-400 hover:text-indigo-600 rounded"
                              title="Edit task"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleTaskDelete(task.id)}
                              className="p-1 text-gray-400 hover:text-red-600 rounded"
                              title="Delete task"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {sortedAndPaginatedTasks.totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing {((currentPage - 1) * tasksPerPage) + 1} to {Math.min(currentPage * tasksPerPage, sortedAndPaginatedTasks.totalTasks)} of {sortedAndPaginatedTasks.totalTasks} tasks
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="flex items-center gap-1 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </button>
                  <span className="px-3 py-2 text-sm text-gray-600">
                    Page {currentPage} of {sortedAndPaginatedTasks.totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(Math.min(sortedAndPaginatedTasks.totalPages, currentPage + 1))}
                    disabled={currentPage === sortedAndPaginatedTasks.totalPages}
                    className="flex items-center gap-1 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Add Task Modal */}
        <AddTaskModal
          isOpen={isAddTaskModalOpen}
          onClose={handleCloseModal}
          editTask={editTask || undefined}
          onTaskSaved={handleTaskSaved}
        />
      </div>
    </Layout>
  );
}