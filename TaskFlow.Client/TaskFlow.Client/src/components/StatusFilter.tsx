import { useState } from 'react';
import { Filter, X, Check, Circle, PlayCircle, CheckCircle2, PauseCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';

type ColumnId = 'Pending' | 'InProgress' | 'Completed' | 'OnHold' | 'Cancelled';

interface StatusOption {
  id: ColumnId;
  title: string;
  icon: React.ReactNode;
  color: string;
}

const statusOptions: StatusOption[] = [
  {
    id: 'Pending',
    title: 'To Do',
    icon: <Circle className="h-4 w-4" />,
    color: 'text-gray-600',
  },
  {
    id: 'InProgress',
    title: 'In Progress',
    icon: <PlayCircle className="h-4 w-4" />,
    color: 'text-blue-600',
  },
  {
    id: 'Completed',
    title: 'Done',
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: 'text-green-600',
  },
  {
    id: 'OnHold',
    title: 'On Hold',
    icon: <PauseCircle className="h-4 w-4" />,
    color: 'text-yellow-600',
  },
  {
    id: 'Cancelled',
    title: 'Cancelled',
    icon: <XCircle className="h-4 w-4" />,
    color: 'text-red-600',
  },
];

interface StatusFilterProps {
  visibleStatuses: ColumnId[];
  onStatusToggle: (status: ColumnId) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  taskCounts: Record<ColumnId, number>;
}

export default function StatusFilter({
  visibleStatuses,
  onStatusToggle,
  onSelectAll,
  onClearAll,
  taskCounts,
}: StatusFilterProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const allSelected = visibleStatuses.length === statusOptions.length;
  const noneSelected = visibleStatuses.length === 0;
  const activeFilters = statusOptions.length - visibleStatuses.length;

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-4">
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <Filter className="h-5 w-5 text-gray-500" />
          <div>
            <h3 className="text-sm font-medium text-gray-900">Filter by Status</h3>
            <p className="text-xs text-gray-500">
              {noneSelected ? 'No statuses selected' : 
               allSelected ? 'All statuses shown' : 
               `${visibleStatuses.length} of ${statusOptions.length} statuses shown`}
              {activeFilters > 0 && !allSelected && (
                <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                  {activeFilters} hidden
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!noneSelected && !allSelected && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClearAll();
              }}
              className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100"
            >
              Clear
            </button>
          )}
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-100 transition-all duration-200 ease-in-out">
          <div className="flex items-center justify-between mb-3 pt-3">
            <span className="text-sm font-medium text-gray-700">Status Types</span>
            <div className="flex gap-2">
              <button
                onClick={onSelectAll}
                disabled={allSelected}
                className="text-xs text-indigo-600 hover:text-indigo-700 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                Select All
              </button>
              <button
                onClick={onClearAll}
                disabled={noneSelected}
                className="text-xs text-gray-600 hover:text-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                Clear All
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {statusOptions.map((status) => {
              const isSelected = visibleStatuses.includes(status.id);
              const count = taskCounts[status.id] || 0;

              return (
                <label
                  key={status.id}
                  className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-all duration-150 ease-in-out ${
                    isSelected 
                      ? 'bg-indigo-50 border border-indigo-200 scale-[1.02]' 
                      : 'hover:bg-gray-50 border border-transparent hover:scale-[1.01]'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onStatusToggle(status.id)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <div className={`flex items-center gap-1.5 ${status.color}`}>
                    {status.icon}
                    <span className="text-sm font-medium text-gray-900">
                      {status.title}
                    </span>
                  </div>
                  <span className="ml-auto bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded-full font-medium">
                    {count}
                  </span>
                </label>
              );
            })}
          </div>

          {visibleStatuses.length === 0 && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                <span className="font-medium">No statuses selected.</span> Please select at least one status to view your tasks.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}