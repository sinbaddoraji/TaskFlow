import { useState } from 'react';
import { Plus, X } from 'lucide-react';

interface AddSubtaskFormProps {
  onAdd: (title: string) => void;
  onCancel: () => void;
}

export default function AddSubtaskForm({ onAdd, onCancel }: AddSubtaskFormProps) {
  const [title, setTitle] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onAdd(title.trim());
      setTitle('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-2 border border-gray-200 rounded bg-gray-50">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a subtask..."
          className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoFocus
        />
        <button
          type="submit"
          disabled={!title.trim()}
          className="p-1 text-green-600 hover:text-green-700 disabled:text-gray-400 transition-colors"
          title="Add subtask"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="p-1 text-gray-500 hover:text-gray-600 transition-colors"
          title="Cancel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
}