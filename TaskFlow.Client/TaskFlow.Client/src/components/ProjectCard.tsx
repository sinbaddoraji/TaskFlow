import { useState } from 'react';
import { 
  MoreVertical, 
  Edit, 
  Trash2, 
  Archive, 
  ArchiveRestore,
  Users, 
  Calendar,
  Tag,
  Folder,
  Eye,
  Lock
} from 'lucide-react';
import { format } from 'date-fns';
import { type Project } from '../services/projectService';

interface ProjectCardProps {
  project: Project;
  viewMode: 'grid' | 'list';
  onEdit: (project: Project) => void;
  onDelete: (projectId: string) => void;
  onArchive: (projectId: string, archive: boolean) => void;
}

export default function ProjectCard({ project, viewMode, onEdit, onDelete, onArchive }: ProjectCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const handleEdit = () => {
    setShowMenu(false);
    onEdit(project);
  };

  const handleDelete = () => {
    setShowMenu(false);
    onDelete(project.id);
  };

  const handleArchive = () => {
    setShowMenu(false);
    onArchive(project.id, !project.isArchived);
  };

  if (viewMode === 'list') {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow ${
        project.isArchived ? 'opacity-60' : ''
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            {/* Project Icon/Color */}
            <div 
              className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-semibold"
              style={{ backgroundColor: project.color }}
            >
              {project.icon || <Folder className="h-6 w-6" />}
            </div>

            {/* Project Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-semibold text-gray-900 truncate">
                  {project.name}
                </h3>
                {project.isArchived && (
                  <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                    Archived
                  </span>
                )}
                {project.isPublic ? (
                  <Eye className="h-4 w-4 text-gray-400" />
                ) : (
                  <Lock className="h-4 w-4 text-gray-400" />
                )}
              </div>
              {project.description && (
                <p className="text-gray-600 text-sm truncate">{project.description}</p>
              )}
            </div>

            {/* Project Stats */}
            <div className="flex items-center gap-6 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{project.taskCount || 0} tasks</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{project.members.length + 1} members</span>
              </div>
              <div className="text-xs">
                Updated {format(new Date(project.updatedAt), 'MMM d, yyyy')}
              </div>
            </div>
          </div>

          {/* Actions Menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            
            {showMenu && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-20">
                  <button
                    onClick={handleEdit}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <Edit className="h-4 w-4" />
                    Edit project
                  </button>
                  <button
                    onClick={handleArchive}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    {project.isArchived ? (
                      <>
                        <ArchiveRestore className="h-4 w-4" />
                        Restore project
                      </>
                    ) : (
                      <>
                        <Archive className="h-4 w-4" />
                        Archive project
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleDelete}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete project
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Tags */}
        {project.tags.length > 0 && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
            <Tag className="h-3 w-3 text-gray-400" />
            <div className="flex flex-wrap gap-1">
              {project.tags.slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
                >
                  {tag}
                </span>
              ))}
              {project.tags.length > 3 && (
                <span className="text-xs text-gray-500">
                  +{project.tags.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Grid view
  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow relative ${
      project.isArchived ? 'opacity-60' : ''
    }`}>
      {/* Actions Menu */}
      <div className="absolute top-3 right-3">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="p-1 hover:bg-gray-100 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
        
        {showMenu && (
          <>
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setShowMenu(false)}
            />
            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-20">
              <button
                onClick={handleEdit}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <Edit className="h-4 w-4" />
                Edit project
              </button>
              <button
                onClick={handleArchive}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                {project.isArchived ? (
                  <>
                    <ArchiveRestore className="h-4 w-4" />
                    Restore project
                  </>
                ) : (
                  <>
                    <Archive className="h-4 w-4" />
                    Archive project
                  </>
                )}
              </button>
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
                Delete project
              </button>
            </div>
          </>
        )}
      </div>

      <div className="group">
        {/* Project Header */}
        <div className="flex items-start gap-3 mb-3">
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold flex-shrink-0"
            style={{ backgroundColor: project.color }}
          >
            {project.icon || <Folder className="h-5 w-5" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900 truncate">{project.name}</h3>
              {project.isArchived && (
                <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                  Archived
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {project.isPublic ? (
                <Eye className="h-3 w-3 text-gray-400" />
              ) : (
                <Lock className="h-3 w-3 text-gray-400" />
              )}
              <span className="text-xs text-gray-500">
                {project.isPublic ? 'Public' : 'Private'}
              </span>
            </div>
          </div>
        </div>

        {/* Description */}
        {project.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{project.description}</p>
        )}

        {/* Tags */}
        {project.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {project.tags.slice(0, 2).map((tag, index) => (
              <span
                key={index}
                className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
              >
                {tag}
              </span>
            ))}
            {project.tags.length > 2 && (
              <span className="text-xs text-gray-500 px-2 py-1">
                +{project.tags.length - 2}
              </span>
            )}
          </div>
        )}

        {/* Project Stats */}
        <div className="flex items-center justify-between text-sm text-gray-500 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{project.taskCount || 0}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              <span>{project.members.length + 1}</span>
            </div>
          </div>
          <div className="text-xs">
            {format(new Date(project.updatedAt), 'MMM d')}
          </div>
        </div>
      </div>
    </div>
  );
}