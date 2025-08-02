import { useState } from 'react';
import { Send } from 'lucide-react';

interface AddCommentFormProps {
  onAdd: (content: string) => void;
  onCancel: () => void;
}

export default function AddCommentForm({ onAdd, onCancel }: AddCommentFormProps) {
  const [content, setContent] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim()) {
      onAdd(content.trim());
      setContent('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      if (content.trim()) {
        onAdd(content.trim());
        setContent('');
      }
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-3 border border-gray-200 rounded bg-gray-50">
      <div className="space-y-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Write a comment..."
          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          rows={3}
          autoFocus
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">
            Ctrl+Enter to post
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1 text-gray-600 hover:text-gray-700 text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!content.trim()}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:bg-gray-400 transition-colors flex items-center gap-1"
            >
              <Send className="w-3 h-3" />
              Comment
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}