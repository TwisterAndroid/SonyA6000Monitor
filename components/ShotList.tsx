import React from 'react';
import { CheckCircle2, Circle, Plus, Trash2, Clapperboard } from 'lucide-react';
import { Shot } from '../types';

interface ShotListProps {
  shots: Shot[];
  activeShotId: string | null;
  onSelectShot: (id: string) => void;
  onAddShot: (name: string) => void;
  onToggleComplete: (id: string) => void;
  onDeleteShot: (id: string) => void;
}

export const ShotList: React.FC<ShotListProps> = ({ 
  shots, 
  activeShotId, 
  onSelectShot, 
  onAddShot, 
  onToggleComplete,
  onDeleteShot
}) => {
  const [newShotName, setNewShotName] = React.useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newShotName.trim()) {
      onAddShot(newShotName.trim());
      setNewShotName('');
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex flex-col h-64 shadow-lg">
      <div className="flex items-center gap-2 mb-3 text-zinc-100 font-semibold border-b border-zinc-800 pb-2">
        <Clapperboard className="w-4 h-4 text-orange-500" />
        <h3>Shot List</h3>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 space-y-1 scrollbar-hide">
        {shots.length === 0 && (
          <div className="text-zinc-500 text-xs text-center py-4 italic">No shots planned. Add one below.</div>
        )}
        {shots.map((shot) => (
          <div 
            key={shot.id}
            onClick={() => onSelectShot(shot.id)}
            className={`group flex items-center justify-between p-2 rounded cursor-pointer border transition-all ${
              activeShotId === shot.id 
                ? 'bg-orange-900/20 border-orange-500/50' 
                : 'bg-zinc-950 border-transparent hover:bg-zinc-800'
            }`}
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <button 
                onClick={(e) => { e.stopPropagation(); onToggleComplete(shot.id); }}
                className={`${shot.completed ? 'text-green-500' : 'text-zinc-600 group-hover:text-zinc-400'}`}
              >
                {shot.completed ? <CheckCircle2 size={16} /> : <Circle size={16} />}
              </button>
              <div className="flex flex-col min-w-0">
                <span className={`text-sm font-medium truncate ${shot.completed ? 'text-zinc-500 line-through' : 'text-zinc-200'}`}>
                  {shot.name}
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">Take {shot.take}</span>
              </div>
            </div>
            
            <button 
              onClick={(e) => { e.stopPropagation(); onDeleteShot(shot.id); }}
              className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 text-zinc-500 transition-opacity"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
        <input 
          type="text" 
          value={newShotName}
          onChange={(e) => setNewShotName(e.target.value)}
          placeholder="New Scene Name..."
          className="flex-1 bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200 focus:border-orange-500 outline-none"
        />
        <button type="submit" className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 p-1.5 rounded">
          <Plus size={16} />
        </button>
      </form>
    </div>
  );
};
