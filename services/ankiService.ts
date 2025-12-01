
import { AnkiSettings } from '../types';

export const defaultAnkiSettings: AnkiSettings = {
  host: '127.0.0.1',
  port: 8765,
  deck: 'Default',
  model: 'Basic',
  wordField: 'Front',
  sentenceField: 'Back',
  meaningField: '',
  audioField: '',
  tags: 'epub-reader'
};

const invoke = async (action: string, params: any = {}, settings: AnkiSettings) => {
  const url = `http://${settings.host}:${settings.port}`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      mode: 'cors', // Explicitly set CORS mode
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, version: 6, params })
    });
    
    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
    
    const result = await response.json();
    if (result.error) throw new Error(result.error);
    return result.result;
  } catch (error: any) {
    console.error('AnkiConnect Error:', error);
    if (error.message && error.message.includes('Failed to fetch')) {
        throw new Error('Connection failed. Ensure Anki is open, AnkiConnect installed, and if using HTTPS, allow Mixed Content.');
    }
    throw error;
  }
};

export const checkConnection = async (settings: AnkiSettings) => {
  return invoke('version', {}, settings);
};

export const getDeckNames = async (settings: AnkiSettings) => {
  return invoke('deckNames', {}, settings);
};

export const getModelNames = async (settings: AnkiSettings) => {
  return invoke('modelNames', {}, settings);
};

export const getModelFieldNames = async (modelName: string, settings: AnkiSettings) => {
  return invoke('modelFieldNames', { modelName }, settings);
};

export const storeMediaFile = async (filename: string, dataBase64: string, settings: AnkiSettings) => {
    return invoke('storeMediaFile', { filename, data: dataBase64 }, settings);
}

export const addNote = async (
  word: string, 
  sentence: string, 
  meaning: string,
  audioFilename: string | null,
  settings: AnkiSettings
) => {
  // Construct fields object only with present values
  const fields: Record<string, string> = {};
  
  if (settings.wordField && word) fields[settings.wordField] = word;
  if (settings.sentenceField && sentence) fields[settings.sentenceField] = sentence;
  if (settings.meaningField && meaning) fields[settings.meaningField] = meaning;
  
  if (settings.audioField && audioFilename) {
      fields[settings.audioField] = `[sound:${audioFilename}]`;
  }

  // Validate that at least one field is being sent to avoid "empty card" errors
  if (Object.keys(fields).length === 0) {
      throw new Error("No fields configured or empty content.");
  }

  const note = {
    deckName: settings.deck,
    modelName: settings.model,
    fields,
    options: { allowDuplicate: false },
    tags: settings.tags.split(',').map(t => t.trim()).filter(Boolean)
  };

  return invoke('addNote', { note }, settings);
};
