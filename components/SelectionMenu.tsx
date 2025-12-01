
import React from 'react';
import { SelectionState, Language } from '../types';
import { t } from '../utils/i18n';

interface SelectionMenuProps {
  selection: SelectionState;
  onLookup: () => void;
  onHighlight: () => void;
  onAnki: () => void;
  onClose: () => void;
  lang: Language;
}

const SelectionMenu: React.FC<SelectionMenuProps> = ({ 
  selection, onLookup, onHighlight, onAnki, onClose, lang 
}) => {
  if (!selection.visible) return null;

  return (
    <div 
      className="fixed z-50 bg-secondary text-white rounded-lg shadow-lg flex items-center p-1 gap-1 text-sm animate-fade-in"
      style={{ 
        left: selection.x, 
        top: selection.y - 50, // Position above
        transform: 'translateX(-50%)' 
      }}
    >
      <button 
        onClick={onLookup}
        className="px-3 py-1.5 hover:bg-white/20 rounded flex items-center gap-1"
        title={t('dictionary', lang)}
      >
        <i className="fas fa-book"></i>
        <span className="hidden sm:inline">{t('dictionary', lang)}</span>
      </button>
      
      <div className="w-px h-4 bg-white/20"></div>

      <button 
        onClick={onHighlight}
        className="px-3 py-1.5 hover:bg-white/20 rounded flex items-center gap-1"
        title="Highlight"
      >
        <i className="fas fa-highlighter"></i>
      </button>

      <div className="w-px h-4 bg-white/20"></div>

      <button 
        onClick={onAnki}
        className="px-3 py-1.5 hover:bg-white/20 rounded flex items-center gap-1 text-green-300 hover:text-green-200"
        title="Anki (+Audio)"
      >
        <i className="fas fa-plus-circle"></i>
        <span className="hidden sm:inline">Anki</span>
      </button>

      {/* Triangle pointer */}
      <div className="absolute top-full left-1/2 -ml-2 border-4 border-transparent border-t-secondary"></div>
    </div>
  );
};

export default SelectionMenu;
