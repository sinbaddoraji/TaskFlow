import { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Grid, 
  List, 
  Folder
} from 'lucide-react';
import Layout from '../components/Layout';
import AddProjectModal from '../components/AddProjectModal';
import ProjectCard from '../components/ProjectCard';
import { projectService, type Project } from '../services/projectService';

type ViewMode = 'grid' | 'list';

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [isAddProjectModalOpen, setIsAddProjectModalOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedProjects = await projectService.getProjects();
      setProjects(fetchedProjects);
    } catch (err) {
      console.error('Error fetching projects:', err);
      let errorMessage = 'Failed to load projects. Please try again.';
      if (err instanceof Error) {
        errorMessage = `Failed to load projects: ${err.message}`;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesArchived = showArchived ? true : !project.isArchived;
    return matchesSearch && matchesArchived;
  });

  const handleAddProject = () => {
    setEditProject(null);
    setIsAddProjectModalOpen(true);
  };

  const handleEditProject = (project: Project) => {
    setEditProject(project);
    setIsAddProjectModalOpen(true);
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return;
    }

    try {
      await projectService.deleteProject(projectId);
      setProjects(prevProjects => prevProjects.filter(p => p.id !== projectId));
    } catch (err) {
      console.error('Error deleting project:', err);
      let errorMessage = 'Failed to delete project. Please try again.';
      if (err instanceof Error) {
        errorMessage = `Failed to delete project: ${err.message}`;
      }
      setError(errorMessage);
    }
  };

  const handleArchiveProject = async (projectId: string, archive: boolean) => {
    try {
      const updatedProject = await projectService.updateProject(projectId, { 
        isArchived: archive 
      });
      setProjects(prevProjects =>
        prevProjects.map(p => (p.id === projectId ? updatedProject : p))
      );
    } catch (err) {
      console.error('Error updating project:', err);
      let errorMessage = `Failed to ${archive ? 'archive' : 'restore'} project. Please try again.`;
      if (err instanceof Error) {
        errorMessage = `Failed to ${archive ? 'archive' : 'restore'} project: ${err.message}`;
      }
      setError(errorMessage);
    }
  };

  const handleProjectSaved = () => {
    fetchProjects();
  };

  const handleCloseModal = () => {
    setIsAddProjectModalOpen(false);
    setEditProject(null);
  };

  return (
    <Layout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
              <p className="text-gray-600">
                {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''}
                {showArchived && ' (including archived)'}
              </p>
            </div>
            <button
              onClick={handleAddProject}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              New Project
            </button>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowArchived(!showArchived)}
                className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                  showArchived 
                    ? 'bg-gray-200 text-gray-800' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {showArchived ? 'Hide Archived' : 'Show Archived'}
              </button>
              
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded transition-colors ${
                    viewMode === 'grid' 
                      ? 'bg-white text-indigo-600 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                  title="Grid view"
                >
                  <Grid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded transition-colors ${
                    viewMode === 'list' 
                      ? 'bg-white text-indigo-600 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                  title="List view"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

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

        {/* Projects Content */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading projects...</p>
            </div>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-12">
            <Folder className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No projects found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm 
                ? 'Try adjusting your search terms' 
                : 'Get started by creating your first project'
              }
            </p>
            {!searchTerm && (
              <button
                onClick={handleAddProject}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Create Project
              </button>
            )}
          </div>
        ) : (
          <div className={viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' 
            : 'space-y-4'
          }>
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                viewMode={viewMode}
                onEdit={handleEditProject}
                onDelete={handleDeleteProject}
                onArchive={handleArchiveProject}
              />
            ))}
          </div>
        )}

        {/* Add/Edit Project Modal */}
        <AddProjectModal
          isOpen={isAddProjectModalOpen}
          onClose={handleCloseModal}
          editProject={editProject || undefined}
          onProjectSaved={handleProjectSaved}
        />
      </div>
    </Layout>
  );
}