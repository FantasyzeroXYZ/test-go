import { DictionaryResult } from '../types';

export const fetchDefinition = async (word: string): Promise<DictionaryResult[]> => {
  try {
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
    if (!response.ok) {
      if (response.status === 404) return [];
      throw new Error('Network response was not ok');
    }
    return await response.json();
  } catch (error) {
    console.error("Dictionary API error", error);
    throw error;
  }
};