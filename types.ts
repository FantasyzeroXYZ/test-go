
export interface Book {
  coverUrl?: string;
  metadata?: {
    title: string;
    creator: string;
    [key: string]: any;
  };
  navigation?: NavigationItem[];
  spine: any;
  renderTo: (elementId: string, options: any) => Rendition;
  destroy: () => void;
  ready: Promise<any>;
  loaded: {
    navigation: Promise<any>;
    metadata: Promise<any>;
    spine: Promise<any>;
    resources: Promise<any>;
    manifest: Promise<any>;
  };
  archive: {
    createUrl: (url: string) => Promise<string>;
    getBlob: (url: string) => Promise<Blob>;
  };
  load: (url: string) => Promise<Document>;
  container: {
      packagePath: string;
  }
}

export interface NavigationItem {
  id: string;
  href: string;
  label: string;
  subitems?: NavigationItem[];
  parent?: string;
}

export interface Rendition {
  display: (target?: string) => Promise<void>;
  prev: () => Promise<void>;
  next: () => Promise<void>;
  themes: {
    fontSize: (size: string) => void;
    register: (name: string, styles: any) => void;
    select: (name: string) => void;
  };
  on: (event: string, callback: any) => void;
  hooks: {
    content: {
      register: (callback: any) => void;
    }
  };
  location: {
    start: {
      cfi: string;
      displayed: {
        page: number;
        total: number;
      };
      href: string;
      index: number;
    };
  };
  getContents: () => any[];
  manager: {
      container: HTMLElement;
  };
  annotations: {
      add: (type: string, cfiRange: string, data?: any, cb?: any, className?: string) => void;
      remove: (cfiRange: string, type: string) => void;
  };
  settings: {
      spread: string;
  };
  resize: (width?: number | string, height?: number | string) => void;
}

// Anki 设置接口
export interface AnkiSettings {
  host: string;
  port: number;
  deck: string;
  model: string;
  wordField: string;
  sentenceField: string;
  meaningField: string;
  audioField: string; 
  tags: string;
}

// 词典结果接口
export interface DictionaryResult {
  word: string;
  phonetic?: string;
  meanings: {
    partOfSpeech: string;
    definitions: {
      definition: string;
      example?: string;
    }[];
  }[];
}

export type ThemeType = 'light' | 'dark' | 'sepia';
export type FontSize = 'small' | 'medium' | 'large' | 'xlarge';
export type Language = 'en' | 'zh';
export type SpreadMode = 'none' | 'auto'; // none = 单页, auto = 宽度足够时双页

// 自定义 TTS 设置接口
export interface CustomTTSSettings {
    enabled: boolean;
    host: string;
    port: number;
    voice: string;
    speed: number;
    volume: number;
    pitch: number;
}

// 应用全局设置
export interface AppSettings {
  theme: ThemeType;
  fontSize: FontSize;
  language: Language;
  spread: SpreadMode;
  autoPlayAudio: boolean;
  syncTextHighlight: boolean;
  tts: CustomTTSSettings;
}

// SMIL 解析结果接口（用于音频同步）
export interface SmilPar {
  textSrc: string; 
  elementId: string;
  audioSrc: string; 
  begin: number; 
  end: number;   
}

// 文本选择状态接口
export interface SelectionState {
    visible: boolean;
    x: number;
    y: number;
    text: string;
    cfiRange: string;
    sentence: string;
}

// 书架中的书籍元数据
export interface LibraryBook {
    id: string;          // 唯一标识符 (UUID)
    title: string;       // 书名
    author: string;      // 作者
    cover?: string | null; // 封面图片数据 (Base64 字符串)
    data?: ArrayBuffer;   // EPUB 文件二进制数据 (列表页可选)
    addedAt: number;     // 添加时间戳
    progressCfi?: string;// 阅读进度 CFI
}
