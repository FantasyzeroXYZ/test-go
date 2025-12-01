import React, { useState } from 'react';
import { AnkiSettings, DictionaryResult, Language } from '../types';
import * as AnkiService from '../services/ankiService';
import { t } from '../utils/i18n';

interface DictionaryModalProps {
  word: string;
  sentence: string;
  results: DictionaryResult[] | null;
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
  ankiSettings: AnkiSettings;
  lang: Language;
  onAddToAnkiWithAudio: () => Promise<string | null>; // Callback to parent to get audio
}

const DictionaryModal: React.FC<DictionaryModalProps> = ({
  word, sentence, results, isLoading, error, onClose, ankiSettings, lang, onAddToAnkiWithAudio
}) => {
  const [addingToAnki, setAddingToAnki] = useState(false);
  const [ankiStatus, setAnkiStatus] = useState<string | null>(null);

  const handleAddToAnki = async () => {
    if (!results || results.length === 0) return;
    setAddingToAnki(true);
    setAnkiStatus(null);
    try {
      const definition = results[0].meanings[0]?.definitions[0]?.definition || "No definition found";
      const pos = results[0].meanings[0]?.partOfSpeech || "";
      const meaningText = `${pos ? `(${pos}) ` : ''}${definition}`;

      // Try to extract audio from parent
      let audioFilename: string | null = null;
      try {
         audioFilename = await onAddToAnkiWithAudio();
      } catch (e) {
         console.warn("Audio extraction failed, adding text only", e);
      }

      await AnkiService.addNote(word, sentence, meaningText, audioFilename, ankiSettings);
      setAnkiStatus("Success! Added to Anki.");
      setTimeout(() => {
          onClose();
          setAnkiStatus(null);
      }, 1500);
    } catch (err: any) {
      setAnkiStatus(`Error: ${err.message}`);
    } finally {
      setAddingToAnki(false);
    }
  };

  if (!word) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="bg-primary px-6 py-4 flex justify-between items-center text-white">
          <h3 className="text-xl font-bold truncate">{t('dictionary', lang)}</h3>
          <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full">
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="mb-4">
             <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Selected Text</span>
             <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{word}</p>
             <p className="text-sm text-gray-500 mt-1 line-clamp-2 italic">"{sentence}"</p>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <i className="fas fa-circle-notch fa-spin text-3xl text-primary"></i>
            </div>
          ) : error ? (
            <div className="text-center py-6 text-red-500">
              <i className="fas fa-exclamation-circle mb-2 text-2xl"></i>
              <p>{error}</p>
            </div>
          ) : results ? (
            <div className="space-y-4">
               {results.map((res, i) => (
                 <div key={i} className="space-y-3">
                   {res.phonetic && <p className="text-gray-500 italic font-serif">/{res.phonetic}/</p>}
                   {res.meanings.map((m, j) => (
                     <div key={j} className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg border-l-4 border-primary">
                       <span className="text-xs font-bold bg-gray-200 dark:bg-gray-600 px-2 py-0.5 rounded text-gray-700 dark:text-gray-200 uppercase mb-1 inline-block">
                         {m.partOfSpeech}
                       </span>
                       <ul className="list-disc ml-5 space-y-1 text-sm text-gray-700 dark:text-gray-300 mt-1">
                         {m.definitions.slice(0, 3).map((def, k) => (
                           <li key={k}>
                             {def.definition}
                             {def.example && <p className="text-xs text-gray-500 mt-1 italic">"{def.example}"</p>}
                           </li>
                         ))}
                       </ul>
                     </div>
                   ))}
                 </div>
               ))}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 border-t dark:border-gray-700 flex flex-col gap-2">
           {ankiStatus && (
               <div className={`text-sm text-center p-2 rounded ${ankiStatus.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                   {ankiStatus}
               </div>
           )}
           <button 
             onClick={handleAddToAnki}
             disabled={isLoading || addingToAnki || !!error}
             className="w-full bg-primary hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg shadow-lg transition-colors flex items-center justify-center gap-2"
           >
             {addingToAnki ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-plus-circle"></i>}
             {t('addToAnki', lang)}
           </button>
        </div>
      </div>
    </div>
  );
};

export default DictionaryModal;
