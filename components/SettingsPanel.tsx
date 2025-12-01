
import React, { useState, useEffect } from 'react';
import { AnkiSettings, AppSettings, FontSize, ThemeType, Language, SpreadMode } from '../types';
import * as AnkiService from '../services/ankiService';
import { t } from '../utils/i18n';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSettingsChange: (newSettings: AppSettings) => void;
  ankiSettings: AnkiSettings;
  onAnkiSettingsChange: (newSettings: AnkiSettings) => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isOpen, onClose, settings, onSettingsChange, ankiSettings, onAnkiSettingsChange
}) => {
  const [ankiStatus, setAnkiStatus] = useState<string>('Unknown');
  const [decks, setDecks] = useState<string[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [fields, setFields] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      testAnki();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const testAnki = async () => {
    setAnkiStatus(t('loading', settings.language));
    try {
      await AnkiService.checkConnection(ankiSettings);
      setAnkiStatus('Connected');
      const d = await AnkiService.getDeckNames(ankiSettings);
      setDecks(d);
      const m = await AnkiService.getModelNames(ankiSettings);
      setModels(m);
      if (ankiSettings.model) {
        const f = await AnkiService.getModelFieldNames(ankiSettings.model, ankiSettings);
        setFields(f);
      }
    } catch (e) {
      setAnkiStatus('Failed');
    }
  };

  const handleModelChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newModel = e.target.value;
    onAnkiSettingsChange({ ...ankiSettings, model: newModel });
    try {
      const f = await AnkiService.getModelFieldNames(newModel, ankiSettings);
      setFields(f);
    } catch (err) {
      console.error(err);
    }
  };

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  const updateTTSSetting = (key: string, value: any) => {
      onSettingsChange({
          ...settings,
          tts: { ...settings.tts, [key]: value }
      });
  };

  const updateAnkiSetting = <K extends keyof AnkiSettings>(key: K, value: AnkiSettings[K]) => {
    onAnkiSettingsChange({ ...ankiSettings, [key]: value });
  };

  const lang = settings.language;

  return (
    <div className={`fixed inset-y-0 right-0 w-full sm:w-96 bg-white dark:bg-gray-800 shadow-2xl transform transition-transform duration-300 z-50 overflow-y-auto ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
        <h2 className="text-xl font-bold dark:text-white">{t('settings', lang)}</h2>
        <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full">
          <i className="fas fa-times text-gray-600 dark:text-gray-300"></i>
        </button>
      </div>

      <div className="p-6 space-y-8">
        
        {/* Language */}
        <section>
             <h3 className="text-lg font-semibold mb-4 text-primary dark:text-blue-400 border-b pb-2">{t('language', lang)}</h3>
             <div className="flex gap-2">
                 <button 
                   onClick={() => updateSetting('language', 'en')}
                   className={`flex-1 py-1 rounded border ${settings.language === 'en' ? 'bg-primary text-white border-primary' : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 dark:text-white'}`}
                 >English</button>
                 <button 
                   onClick={() => updateSetting('language', 'zh')}
                   className={`flex-1 py-1 rounded border ${settings.language === 'zh' ? 'bg-primary text-white border-primary' : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 dark:text-white'}`}
                 >中文</button>
             </div>
        </section>

        {/* Appearance */}
        <section>
          <h3 className="text-lg font-semibold mb-4 text-primary dark:text-blue-400 border-b pb-2">{t('appearance', lang)}</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('theme', lang)}</label>
              <div className="grid grid-cols-3 gap-2">
                {(['light', 'dark', 'sepia'] as ThemeType[]).map(t => (
                  <button
                    key={t}
                    onClick={() => updateSetting('theme', t)}
                    className={`p-2 border rounded capitalize ${settings.theme === t ? 'border-primary bg-blue-50 dark:bg-blue-900' : 'border-gray-300 dark:border-gray-600 dark:text-gray-300'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('fontSize', lang)}</label>
              <select 
                value={settings.fontSize} 
                onChange={(e) => updateSetting('fontSize', e.target.value as FontSize)}
                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="small">{t('sizeSmall', lang)}</option>
                <option value="medium">{t('sizeMedium', lang)}</option>
                <option value="large">{t('sizeLarge', lang)}</option>
                <option value="xlarge">{t('sizeXLarge', lang)}</option>
              </select>
            </div>
             <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('viewMode', lang)}</label>
              <div className="flex gap-2">
                 <button 
                   onClick={() => updateSetting('spread', 'none')}
                   className={`flex-1 py-1 text-sm rounded border ${settings.spread === 'none' ? 'bg-primary text-white border-primary' : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 dark:text-white'}`}
                 >{t('singlePage', lang)}</button>
                 <button 
                   onClick={() => updateSetting('spread', 'auto')}
                   className={`flex-1 py-1 text-sm rounded border ${settings.spread === 'auto' ? 'bg-primary text-white border-primary' : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 dark:text-white'}`}
                 >{t('twoPage', lang)}</button>
             </div>
            </div>
          </div>
        </section>

        {/* Audio / TTS */}
        <section>
          <h3 className="text-lg font-semibold mb-4 text-primary dark:text-blue-400 border-b pb-2">{t('audio', lang)}</h3>
          <div className="space-y-3">
             <label className="flex items-center space-x-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={settings.syncTextHighlight}
                onChange={(e) => updateSetting('syncTextHighlight', e.target.checked)}
                className="rounded text-primary focus:ring-primary"
              />
              <span className="dark:text-gray-300">{t('syncHighlight', lang)}</span>
            </label>
             <label className="flex items-center space-x-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={settings.autoPlayAudio}
                onChange={(e) => updateSetting('autoPlayAudio', e.target.checked)}
                className="rounded text-primary focus:ring-primary"
              />
              <span className="dark:text-gray-300">{t('autoPlay', lang)}</span>
            </label>

            {/* Custom TTS Settings */}
            <div className="pt-2 border-t dark:border-gray-700 mt-2">
                <label className="flex items-center space-x-2 cursor-pointer mb-3">
                  <input 
                    type="checkbox" 
                    checked={settings.tts.enabled}
                    onChange={(e) => updateTTSSetting('enabled', e.target.checked)}
                    className="rounded text-primary focus:ring-primary"
                  />
                  <span className="font-semibold text-sm dark:text-gray-300">{t('enableCustomTTS', lang)}</span>
                </label>

                {settings.tts.enabled && (
                    <div className="space-y-3 pl-2 bg-gray-50 dark:bg-gray-750 p-3 rounded">
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-xs dark:text-gray-400">{t('host', lang)}</label>
                                <input type="text" value={settings.tts.host} onChange={(e) => updateTTSSetting('host', e.target.value)} className="w-full p-1 text-sm border rounded dark:bg-gray-700 dark:text-white" />
                            </div>
                            <div>
                                <label className="text-xs dark:text-gray-400">{t('port', lang)}</label>
                                <input type="number" value={settings.tts.port} onChange={(e) => updateTTSSetting('port', parseInt(e.target.value))} className="w-full p-1 text-sm border rounded dark:bg-gray-700 dark:text-white" />
                            </div>
                        </div>
                        <div>
                             <label className="text-xs dark:text-gray-400">{t('voice', lang)}</label>
                             <input type="text" value={settings.tts.voice} onChange={(e) => updateTTSSetting('voice', e.target.value)} className="w-full p-1 text-sm border rounded dark:bg-gray-700 dark:text-white" placeholder="microsoft_zh-CN-YunxiNeural" />
                        </div>
                         <div className="grid grid-cols-3 gap-2">
                            <div>
                                <label className="text-xs dark:text-gray-400">{t('speed', lang)}</label>
                                <input type="number" value={settings.tts.speed} onChange={(e) => updateTTSSetting('speed', parseInt(e.target.value))} className="w-full p-1 text-sm border rounded dark:bg-gray-700 dark:text-white" />
                            </div>
                            <div>
                                <label className="text-xs dark:text-gray-400">{t('volume', lang)}</label>
                                <input type="number" value={settings.tts.volume} onChange={(e) => updateTTSSetting('volume', parseInt(e.target.value))} className="w-full p-1 text-sm border rounded dark:bg-gray-700 dark:text-white" />
                            </div>
                            <div>
                                <label className="text-xs dark:text-gray-400">{t('pitch', lang)}</label>
                                <input type="number" value={settings.tts.pitch} onChange={(e) => updateTTSSetting('pitch', parseInt(e.target.value))} className="w-full p-1 text-sm border rounded dark:bg-gray-700 dark:text-white" />
                            </div>
                        </div>
                    </div>
                )}
            </div>
          </div>
        </section>

        {/* Anki */}
        <section>
          <div className="flex justify-between items-center mb-4 border-b pb-2">
            <h3 className="text-lg font-semibold text-primary dark:text-blue-400">{t('ankiConnect', lang)}</h3>
            <span className={`text-xs px-2 py-1 rounded ${ankiStatus === 'Connected' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {ankiStatus}
            </span>
          </div>
          
          <div className="space-y-4">
             <div className="grid grid-cols-2 gap-2">
               <div>
                  <label className="text-xs dark:text-gray-400">{t('host', lang)}</label>
                  <input 
                    type="text" 
                    value={ankiSettings.host}
                    onChange={(e) => updateAnkiSetting('host', e.target.value)}
                    className="w-full p-2 border rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
               </div>
               <div>
                  <label className="text-xs dark:text-gray-400">{t('port', lang)}</label>
                  <input 
                    type="number" 
                    value={ankiSettings.port}
                    onChange={(e) => updateAnkiSetting('port', parseInt(e.target.value))}
                    className="w-full p-2 border rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
               </div>
             </div>
             <button onClick={testAnki} className="w-full py-1 text-sm bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 rounded text-gray-800 dark:text-white">
               {t('testConnection', lang)}
             </button>

             <div>
               <label className="text-sm dark:text-gray-300">{t('deck', lang)}</label>
               <select 
                 value={ankiSettings.deck} 
                 onChange={(e) => updateAnkiSetting('deck', e.target.value)}
                 className="w-full p-2 border rounded mt-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
               >
                 <option value="">{t('selectDeck', lang)}</option>
                 {decks.map(d => <option key={d} value={d}>{d}</option>)}
               </select>
             </div>

             <div>
               <label className="text-sm dark:text-gray-300">{t('model', lang)}</label>
               <select 
                 value={ankiSettings.model} 
                 onChange={handleModelChange}
                 className="w-full p-2 border rounded mt-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
               >
                 <option value="">{t('selectModel', lang)}</option>
                 {models.map(m => <option key={m} value={m}>{m}</option>)}
               </select>
             </div>

             {/* Field Mapping */}
             <div className="bg-gray-50 dark:bg-gray-750 p-3 rounded space-y-3">
               <p className="text-xs font-semibold text-gray-500 uppercase">{t('fieldMapping', lang)} {t('allOptional', lang)}</p>
               <div>
                 <label className="text-xs block dark:text-gray-400">{t('wordField', lang)}</label>
                 <select 
                    value={ankiSettings.wordField}
                    onChange={(e) => updateAnkiSetting('wordField', e.target.value)}
                    className="w-full p-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                 >
                   <option value="">{t('selectField', lang)}</option>
                   {fields.map(f => <option key={f} value={f}>{f}</option>)}
                 </select>
               </div>
               <div>
                 <label className="text-xs block dark:text-gray-400">{t('sentenceField', lang)}</label>
                 <select 
                    value={ankiSettings.sentenceField}
                    onChange={(e) => updateAnkiSetting('sentenceField', e.target.value)}
                    className="w-full p-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                 >
                   <option value="">{t('selectField', lang)}</option>
                   {fields.map(f => <option key={f} value={f}>{f}</option>)}
                 </select>
               </div>
               <div>
                 <label className="text-xs block dark:text-gray-400">{t('meaningField', lang)}</label>
                 <select 
                    value={ankiSettings.meaningField}
                    onChange={(e) => updateAnkiSetting('meaningField', e.target.value)}
                    className="w-full p-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                 >
                   <option value="">{t('selectField', lang)}</option>
                   {fields.map(f => <option key={f} value={f}>{f}</option>)}
                 </select>
               </div>
                <div>
                 <label className="text-xs block dark:text-gray-400">{t('audioField', lang)}</label>
                 <select 
                    value={ankiSettings.audioField}
                    onChange={(e) => updateAnkiSetting('audioField', e.target.value)}
                    className="w-full p-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                 >
                   <option value="">{t('selectField', lang)}</option>
                   {fields.map(f => <option key={f} value={f}>{f}</option>)}
                 </select>
               </div>
             </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default SettingsPanel;
