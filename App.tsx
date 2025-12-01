
import React, { useState, useEffect, useRef, useCallback } from 'react';
import ePub from 'epubjs';
import { Book as BookType, Rendition, NavigationItem, AppSettings, AnkiSettings, DictionaryResult, SelectionState, LibraryBook } from './types';
import SettingsPanel from './components/SettingsPanel';
import * as DictionaryService from './services/dictionaryService';
import DictionaryModal from './components/DictionaryModal';
import SelectionMenu from './components/SelectionMenu';
import { defaultAnkiSettings, storeMediaFile } from './services/ankiService';
import { t } from './utils/i18n';
import * as TTSService from './services/ttsService';
import * as StorageService from './services/storageService';

const defaultSettings: AppSettings = {
  theme: 'light',
  fontSize: 'medium',
  language: 'zh',
  spread: 'none',
  autoPlayAudio: true,
  syncTextHighlight: true,
  tts: {
      enabled: false,
      host: '127.0.0.1',
      port: 8774,
      voice: 'microsoft_zh-CN-YunxiNeural',
      speed: 25,
      volume: 50,
      pitch: 50
  }
};

// 辅助函数：Blob 转 Base64
const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

const App: React.FC = () => {
  // --- 核心状态 ---
  // 当前视图模式：'library' (书架) 或 'reader' (阅读器)
  const [view, setView] = useState<'library' | 'reader'>('library');
  const [libraryBooks, setLibraryBooks] = useState<LibraryBook[]>([]);
  const [currentBookId, setCurrentBookId] = useState<string | null>(null);

  const [book, setBook] = useState<BookType | null>(null);
  const [rendition, setRendition] = useState<Rendition | null>(null);
  const [toc, setToc] = useState<NavigationItem[]>([]);
  const [metadata, setMetadata] = useState<any>(null);
  
  // --- 界面状态 ---
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState<string>(''); // 用于显示 "导入中..."
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // --- 文本选择状态 ---
  const [selection, setSelection] = useState<SelectionState>({ visible: false, x: 0, y: 0, text: '', cfiRange: '', sentence: '' });

  // --- 音频状态 ---
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  // 使用 ref 来追踪播放状态，以便在回调中获取最新值
  const isPlayingRef = useRef(false);

  // --- 音频对象 ---
  const audioRef = useRef<HTMLAudioElement>(null);
  const [activeTTSBlob, setActiveTTSBlob] = useState<Blob | null>(null);

  // --- TTS 播放列表状态 ---
  const readableElementsRef = useRef<HTMLElement[]>([]);
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const currentBlockIndexRef = useRef(0); // Ref for access in callbacks

  // --- 配置状态 ---
  const [settings, setSettings] = useState<AppSettings>(() => {
      const saved = localStorage.getItem('epub-settings');
      return saved ? JSON.parse(saved) : defaultSettings;
  });
  
  const [ankiSettings, setAnkiSettings] = useState<AnkiSettings>(() => {
      const saved = localStorage.getItem('epub-anki-settings');
      return saved ? JSON.parse(saved) : defaultAnkiSettings;
  });

  // --- 词典状态 ---
  const [dictModalOpen, setDictModalOpen] = useState(false);
  const [dictResults, setDictResults] = useState<DictionaryResult[] | null>(null);
  const [dictLoading, setDictLoading] = useState(false);
  const [dictError, setDictError] = useState<string | null>(null);

  const readerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- 持久化与主题 ---
  useEffect(() => {
    localStorage.setItem('epub-settings', JSON.stringify(settings));
    document.body.classList.remove('light', 'dark', 'sepia');
    document.body.classList.toggle('dark', settings.theme === 'dark');
    if (settings.theme === 'sepia') document.body.classList.add('sepia');
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('epub-anki-settings', JSON.stringify(ankiSettings));
  }, [ankiSettings]);

  // 同步 isPlaying 状态到 Ref
  useEffect(() => {
      isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // 同步 currentBlockIndex 到 Ref
  useEffect(() => {
      currentBlockIndexRef.current = currentBlockIndex;
  }, [currentBlockIndex]);

  // --- 初始化：加载书架 ---
  useEffect(() => {
      refreshLibrary();
  }, []);

  const refreshLibrary = async () => {
      try {
          const list = await StorageService.getLibraryList();
          setLibraryBooks(list);
      } catch (e) {
          console.error("加载书架失败", e);
      }
  };

  // --- 窗口大小调整处理 (EPUB 布局) ---
  useEffect(() => {
    const handleResize = () => {
      if (rendition && rendition.manager) {
        rendition.manager.container.style.width = '100%';
        rendition.manager.container.style.height = '100%';
        rendition.resize();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [rendition]);

  // --- 样式应用 ---
  useEffect(() => {
    if (rendition) {
      const sizes = { small: '80%', medium: '100%', large: '120%', xlarge: '150%' };
      rendition.themes.fontSize(sizes[settings.fontSize]);
      
      const themes = {
         light: { body: { color: '#333', background: '#fff' } },
         dark: { body: { color: '#ecf0f1', background: '#2c3e50' } },
         sepia: { body: { color: '#5c4b37', background: '#f4ecd8' } }
      };
      rendition.themes.register('light', themes.light);
      rendition.themes.register('dark', themes.dark);
      rendition.themes.register('sepia', themes.sepia);
      rendition.themes.select(settings.theme);

      // 更新布局模式 (Spread)
      if (rendition.settings) {
          // @ts-ignore
          if (rendition.settings.spread !== settings.spread) {
              // @ts-ignore
              rendition.settings.spread = settings.spread;
              // 强制重绘以应用布局变更
              rendition.display(rendition.location.start.cfi);
          }
      }
    }
  }, [rendition, settings.fontSize, settings.theme, settings.spread]);

  // --- 扫描文档以获取可读元素 ---
  const scanDocument = (doc: Document) => {
      const elements = Array.from(doc.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li, blockquote'))
          .filter(el => {
              const htmlEl = el as HTMLElement;
              // 简单的过滤：必须有文本，且不包含其他块级元素（避免重复朗读）
              const hasText = htmlEl.innerText && htmlEl.innerText.trim().length > 0;
              const hasBlockChildren = htmlEl.querySelector('p, h1, h2, h3, h4, h5, h6, li, blockquote');
              return hasText && !hasBlockChildren;
          }) as HTMLElement[];
      
      // 确保每个元素都有 ID
      elements.forEach((el, i) => {
          if (!el.id) el.id = `tts-block-${i}-${Date.now()}`;
      });

      readableElementsRef.current = elements;
      setCurrentBlockIndex(0); // 重置索引
  };

  // --- 书籍导入逻辑 ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) importBook(file);
    // 重置 input 以允许再次选择同一文件
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const importBook = async (file: File) => {
      setIsLoading(true);
      setLoadingText(t('importing', settings.language));
      try {
          const buffer = await file.arrayBuffer();
          // 使用 epub.js 解析元数据
          const tempBook = ePub(buffer);
          await tempBook.ready;
          const meta = await tempBook.loaded.metadata;
          
          // 获取封面并转换为 Base64
          let coverBase64: string | null = null;
          try {
              const coverUrl = await tempBook.coverUrl();
              if (coverUrl) {
                   const coverBlob = await tempBook.archive.getBlob(coverUrl);
                   if (coverBlob) {
                       coverBase64 = await blobToBase64(coverBlob);
                   }
              }
          } catch (e) {
              console.warn("无法获取封面", e);
          }

          const newBook: LibraryBook = {
              id: crypto.randomUUID(),
              title: meta.title || file.name.replace('.epub', ''),
              author: meta.creator || t('unknownAuthor', settings.language),
              data: buffer,
              cover: coverBase64,
              addedAt: Date.now()
          };

          await StorageService.addBook(newBook);
          await refreshLibrary();
          
          // 销毁临时对象
          tempBook.destroy();
      } catch (e) {
          console.error("导入书籍失败", e);
          alert("导入失败，请检查文件是否为有效的 EPUB 格式。");
      } finally {
          setIsLoading(false);
          setLoadingText('');
      }
  };

  // --- 打开书籍 ---
  const openBookFromLibrary = async (id: string) => {
      setIsLoading(true);
      try {
          const bookData = await StorageService.getBookData(id);
          if (bookData && bookData.data) {
              setCurrentBookId(id);
              loadBookData(bookData.data, bookData.progressCfi);
              setView('reader');
          }
      } catch (e) {
          console.error("打开书籍失败", e);
          alert("无法打开书籍数据。");
      } finally {
          setIsLoading(false);
      }
  };

  // --- 删除书籍 ---
  const deleteBook = async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (confirm(t('confirmDelete', settings.language))) {
          await StorageService.deleteBook(id);
          await refreshLibrary();
      }
  };

  // --- 返回书架 ---
  const goBackToLibrary = () => {
      // 销毁当前书籍实例
      if (book) {
          book.destroy();
          setBook(null);
          setRendition(null);
      }
      setToc([]);
      setMetadata(null);
      setCurrentBookId(null);
      stopAudio();
      setView('library');
  };

  // --- 加载书籍数据 (核心阅读器逻辑) ---
  const loadBookData = async (bookData: ArrayBuffer, initialCfi?: string) => {
    setIsLoading(true);
    if (book) book.destroy();

    try {
      const newBook = ePub(bookData);
      setBook(newBook as unknown as BookType);
      await newBook.ready;
      
      setMetadata(await newBook.loaded.metadata);
      const nav = await newBook.loaded.navigation;
      setToc(nav.toc);

      if (readerRef.current) {
        const newRendition = newBook.renderTo(readerRef.current.id, {
          width: '100%',
          height: '100%',
          flow: 'paginated', 
          manager: 'default',
          spread: settings.spread,
          minSpreadWidth: 800
        });

        setRendition(newRendition as unknown as Rendition);
        // 如果有进度，跳转到进度，否则显示首页
        await newRendition.display(initialCfi);

        // 监听位置变化，保存进度
        newRendition.on('relocated', (location: any) => {
          if(location.start.displayed) {
              setCurrentPage(location.start.displayed.page);
              setTotalPages(location.start.displayed.total);
          }
          // 保存阅读进度到数据库
          if (currentBookId) {
              StorageService.updateBookProgress(currentBookId, location.start.cfi);
          }
        });

        // 注册内容钩子 (Selection, CSS, Click)
        newRendition.hooks.content.register((contents: any) => {
           const doc = contents.document;
           
           // 扫描文档生成播放列表
           scanDocument(doc);
           
           contents.addStylesheetRules({
             'body': { 
                 'font-family': 'Helvetica, Arial, sans-serif',
                 'height': '100vh',
                 'overflow': 'hidden' 
             },
             // 保留 CSS 规则作为 fallback
             '.audio-highlight': { 
                 'background-color': '#fde047 !important', 
                 'border-radius': '2px', 
                 'box-shadow': '0 0 2px rgba(255, 235, 59, 0.5)',
                 'transition': 'background-color 0.2s'
             }, 
             '::selection': { 'background': '#bfdbfe' }
           });

           // 文本选择监听
           const handleSelect = () => {
             const sel = doc.getSelection();
             if (!sel || sel.isCollapsed) {
               setSelection(prev => ({ ...prev, visible: false }));
               return;
             }
             const text = sel.toString().trim();
             if (text.length > 0) {
                 const rect = sel.getRangeAt(0).getBoundingClientRect();
                 const iframeRect = readerRef.current?.querySelector('iframe')?.getBoundingClientRect();
                 if (iframeRect) {
                     let sentence = text;
                     try {
                         const container = sel.getRangeAt(0).startContainer.parentElement?.textContent || "";
                         if (container) {
                             // 简单的句子拆分
                             const sentences = container.match(/[^.!?]+[.!?]+/g) || [container];
                             sentence = sentences.find((s: string) => s.includes(text))?.trim() || text;
                         }
                     } catch(e) {}

                     setSelection({
                         visible: true,
                         x: rect.left + iframeRect.left + (rect.width / 2),
                         y: rect.top + iframeRect.top,
                         text,
                         cfiRange: newRendition.location.start.cfi,
                         sentence
                     });
                 }
             }
           };

           // 双击播放监听
           const handleDoubleClick = async (e: MouseEvent) => {
               const sel = doc.getSelection();
               // 如果用户正在选择文本，忽略播放
               if (sel && !sel.isCollapsed) return;

               const target = e.target as HTMLElement;
               // 向上查找包含文本的块级元素
               let current: HTMLElement | null = target;
               while(current && current.tagName !== 'BODY') {
                   // 检查该元素是否在我们的播放列表中
                   const index = readableElementsRef.current.indexOf(current);
                   if (index !== -1) {
                       // 停止之前的，并从这里开始连续播放
                       stopAudio();
                       playBlock(index);
                       return;
                   }
                   current = current.parentElement;
               }
           };

           doc.addEventListener('mouseup', handleSelect);
           doc.addEventListener('dblclick', handleDoubleClick);
           doc.addEventListener('touchend', () => setTimeout(handleSelect, 100));
        });
      }
    } catch (err) {
      console.error("加载书籍错误:", err);
      alert("加载书籍失败。");
    } finally {
      setIsLoading(false);
    }
  };

  // --- 播放控制逻辑 ---

  const playBlock = async (index: number) => {
      const elements = readableElementsRef.current;
      if (index >= elements.length) {
          setIsPlaying(false);
          clearHighlight();
          return;
      }

      const el = elements[index];
      setCurrentBlockIndex(index);
      
      // 使用内联样式高亮
      applyHighlight(el.id);
      
      // 尝试滚动，但不阻塞错误
      try {
          // 注意：在 EPUB 分页模式下，scrollIntoView 可能会影响布局，
          // 但为了确保用户看到，我们仍然尝试平滑滚动到中心。
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch (e) {
          // 忽略滚动错误
      }

      const text = el.innerText;
      if (text) {
          await playTTS(text);
      } else {
          // 如果没有文本（比如空段落），跳过
          playBlock(index + 1);
      }
  };

  const playTTS = async (text: string) => {
      // 不调用 stopAudio()，因为 stopAudio 会清除状态，我们只暂停之前的音频流
      if (audioRef.current) audioRef.current.pause();
      window.speechSynthesis.cancel();
      
      setIsPlaying(true);

      if (settings.tts.enabled) {
          try {
              const blob = await TTSService.generateSpeech(text, settings.tts);
              const url = URL.createObjectURL(blob);
              if (audioRef.current) {
                  audioRef.current.src = url;
                  audioRef.current.play();
                  setActiveTTSBlob(blob);
              }
          } catch (e) {
              console.error(e);
              console.warn("自定义 TTS 失败，切换回浏览器默认 TTS。");
              playBrowserTTS(text);
          }
      } else {
          playBrowserTTS(text);
      }
  };

  const playBrowserTTS = (text: string) => {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = settings.language === 'zh' ? 'zh-CN' : 'en-US';
      
      u.onend = () => {
          // 只有当状态仍为播放时（未被用户暂停），才继续下一段
          if (isPlayingRef.current) {
              playBlock(currentBlockIndexRef.current + 1);
          }
      };
      
      u.onerror = (e) => {
          console.error("TTS Error", e);
          setIsPlaying(false);
      };

      window.speechSynthesis.speak(u);
  };

  const pauseAudio = () => {
      if (settings.tts.enabled && audioRef.current) {
          audioRef.current.pause();
      } else {
          window.speechSynthesis.pause();
      }
      setIsPlaying(false);
  };

  const stopAudio = () => {
      if (audioRef.current) {
          audioRef.current.pause();
      }
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      clearHighlight();
      setActiveTTSBlob(null);
  };

  // 播放按钮逻辑
  const toggleAudio = useCallback(() => {
    if (isPlaying) {
      pauseAudio();
    } else {
      // 1. 尝试恢复自定义 TTS
      if (settings.tts.enabled && audioRef.current && audioRef.current.src && !audioRef.current.ended) {
         audioRef.current.play()
            .then(() => setIsPlaying(true))
            .catch(() => playBlock(currentBlockIndexRef.current)); // 如果恢复失败，重新播放当前块
      } 
      // 2. 尝试恢复浏览器 TTS
      else if (!settings.tts.enabled && window.speechSynthesis.paused) {
         window.speechSynthesis.resume();
         setIsPlaying(true);
      }
      // 3. 如果无法恢复，则从当前索引开始播放
      else {
          playBlock(currentBlockIndexRef.current);
      }
    }
  }, [isPlaying, settings.tts]); 

  // --- 音频事件监听 ---
  
  // Custom TTS Ended Handler
  const handleAudioEnded = () => {
      // 只有当状态仍为播放时（未被用户暂停），才继续下一段
      if (isPlayingRef.current) {
          playBlock(currentBlockIndexRef.current + 1);
      }
  };

  const handleTimeUpdate = () => {
      if (!audioRef.current) return;
      const time = audioRef.current.currentTime;
      setAudioCurrentTime(time);
  };

  const applyHighlight = (elementId: string) => {
      if (!rendition) return;
      clearHighlight();
      
      rendition.getContents().forEach(c => {
          const el = c.document.getElementById(elementId);
          if (el) {
              // 添加类（备用）
              el.classList.add('audio-highlight');
              
              // 强制添加内联样式以保证高亮可见，使用 !important 覆盖任何冲突
              // 使用 cssText 可以一次性添加多个样式并带 important
              el.style.cssText += `
                background-color: rgba(253, 224, 71, 0.5) !important; 
                box-shadow: 0 0 4px rgba(253, 224, 71, 1) !important;
                border-radius: 4px !important;
                transition: all 0.2s ease !important;
              `;
          }
      });
  };

  const clearHighlight = () => {
      if (!rendition) return;
      rendition.getContents().forEach(c => {
          // 清除所有高亮类的样式
          const highlights = c.document.querySelectorAll('.audio-highlight');
          highlights.forEach((el: any) => {
              el.classList.remove('audio-highlight');
              // 清除特定的内联样式
              el.style.backgroundColor = '';
              el.style.boxShadow = '';
              el.style.borderRadius = '';
              el.style.transition = '';
              el.style.cssText = el.style.cssText
                  .replace(/background-color:[^;]+!important;/g, '')
                  .replace(/box-shadow:[^;]+!important;/g, '')
                  .replace(/border-radius:[^;]+!important;/g, '');
          });
      });
  };

  // --- 词典 & Anki 导出 ---
  const handleLookup = async () => {
    if (!selection.text) return;
    setDictModalOpen(true);
    setDictLoading(true);
    setDictError(null);
    setDictResults(null);
    try {
      const results = await DictionaryService.fetchDefinition(selection.text);
      if (results.length === 0) throw new Error(t('noDef', settings.language));
      setDictResults(results);
    } catch (e: any) {
      setDictError(e.message || "Failed.");
    } finally {
      setDictLoading(false);
      setSelection(p => ({ ...p, visible: false }));
    }
  };

  const handleHighlight = () => {
      if (!rendition) return;
      rendition.annotations.add('highlight', selection.cfiRange, {}, null, 'hl-generic');
      rendition.getContents().forEach(c => c.window.getSelection()?.removeAllRanges());
      setSelection(p => ({ ...p, visible: false }));
  };

  const getSelectedAudio = useCallback(async (): Promise<string | null> => {
      // 仅导出自定义 TTS 音频
      if (settings.tts.enabled) {
          try {
             const blob = await TTSService.generateSpeech(selection.sentence || selection.text, settings.tts);
             const reader = new FileReader();
             return new Promise((resolve) => {
                 reader.onloadend = async () => {
                     const base64 = (reader.result as string).split(',')[1];
                     const filename = `anki_tts_${Date.now()}.mp3`;
                     await storeMediaFile(filename, base64, ankiSettings);
                     resolve(filename);
                 };
                 reader.readAsDataURL(blob);
             });
          } catch (e) {
              console.error("TTS 导出失败", e);
              return null;
          }
      }
      return null;

  }, [selection, ankiSettings, settings.tts]);

  // --- 视图渲染 ---

  // 1. 书架视图
  if (view === 'library') {
      return (
        <div className={`h-screen flex flex-col bg-gray-50 dark:bg-gray-900 ${settings.theme === 'sepia' ? 'bg-[#f4ecd8]' : ''}`}>
             <header className="h-16 bg-white dark:bg-gray-800 shadow-sm flex items-center justify-between px-6 z-10">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t('library', settings.language)}</h1>
                <div className="flex gap-3">
                    <button onClick={() => setSettingsOpen(true)} className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                        <i className="fas fa-cog text-xl"></i>
                    </button>
                    <button 
                        onClick={() => fileInputRef.current?.click()} 
                        className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-lg shadow transition-colors flex items-center gap-2"
                        disabled={isLoading}
                    >
                        {isLoading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-plus"></i>}
                        {t('addBook', settings.language)}
                    </button>
                    <input type="file" ref={fileInputRef} accept=".epub" onChange={handleFileUpload} className="hidden" />
                </div>
             </header>

             <main className="flex-1 overflow-y-auto p-6">
                 {libraryBooks.length === 0 ? (
                     <div className="flex flex-col items-center justify-center h-full text-gray-400">
                         <i className="fas fa-book text-6xl mb-4 opacity-20"></i>
                         <p className="text-xl font-medium">{t('noBooks', settings.language)}</p>
                     </div>
                 ) : (
                     <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                         {libraryBooks.map(book => (
                             <div 
                                key={book.id} 
                                onClick={() => openBookFromLibrary(book.id)}
                                className="group relative bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col overflow-hidden border border-transparent hover:border-primary"
                             >
                                 <div className="aspect-[2/3] bg-gray-200 dark:bg-gray-700 relative overflow-hidden">
                                     {book.cover ? (
                                         <img src={book.cover} alt={book.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                     ) : (
                                         <div className="w-full h-full flex items-center justify-center text-gray-400">
                                             <i className="fas fa-book-open text-4xl"></i>
                                         </div>
                                     )}
                                     {/* 删除按钮 */}
                                     <button 
                                        onClick={(e) => deleteBook(book.id, e)}
                                        className="absolute top-2 right-2 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-lg"
                                        title={t('delete', settings.language)}
                                     >
                                         <i className="fas fa-trash-alt text-sm"></i>
                                     </button>
                                     {/* 进度条 */}
                                     {book.progressCfi && (
                                         <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-300">
                                             <div className="h-full bg-green-500 w-full opacity-80"></div> 
                                         </div>
                                     )}
                                 </div>
                                 <div className="p-3">
                                     <h3 className="font-bold text-gray-800 dark:text-gray-100 truncate" title={book.title}>{book.title}</h3>
                                     <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{book.author}</p>
                                 </div>
                             </div>
                         ))}
                     </div>
                 )}
             </main>

             {/* 导入 Loading 遮罩 */}
             {isLoading && (
                 <div className="fixed inset-0 bg-black/50 z-50 flex flex-col items-center justify-center text-white backdrop-blur-sm">
                     <i className="fas fa-circle-notch fa-spin text-5xl mb-4"></i>
                     <p className="text-xl font-medium">{loadingText || t('loading', settings.language)}</p>
                 </div>
             )}
             
             {/* 设置面板 */}
             <SettingsPanel 
                isOpen={settingsOpen} 
                onClose={() => setSettingsOpen(false)} 
                settings={settings}
                onSettingsChange={setSettings}
                ankiSettings={ankiSettings}
                onAnkiSettingsChange={setAnkiSettings}
             />
        </div>
      );
  }

  // 2. 阅读器视图
  return (
    <div className={`h-screen flex flex-col overflow-hidden ${settings.theme === 'sepia' ? 'bg-[#f4ecd8]' : ''}`}>
      
      {/* 顶部导航 */}
      <header className="h-14 bg-secondary text-white flex items-center justify-between px-4 shadow-md z-30 shrink-0">
        <div className="flex items-center gap-3">
           <button onClick={goBackToLibrary} className="p-2 hover:bg-white/10 rounded" title={t('backToLibrary', settings.language)}>
               <i className="fas fa-arrow-left"></i>
           </button>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-white/10 rounded">
            <i className="fas fa-bars"></i>
          </button>
          <h1 className="font-semibold text-lg truncate max-w-[200px] sm:max-w-md">
            {metadata ? metadata.title : t('appTitle', settings.language)}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setSettingsOpen(true)} className="p-2 hover:bg-white/10 rounded">
            <i className="fas fa-cog"></i>
          </button>
        </div>
      </header>

      {/* 主体区域 */}
      <div className="flex-1 flex relative overflow-hidden">
        
        {/* 侧边栏 (目录) */}
        <div className={`absolute inset-y-0 left-0 w-72 bg-white dark:bg-gray-800 shadow-xl transform transition-transform duration-300 z-20 flex flex-col ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
           <div className="p-4 border-b dark:border-gray-700 font-bold dark:text-gray-200 flex justify-between">
             <span>{t('toc', settings.language)}</span>
             <button onClick={() => setSidebarOpen(false)}><i className="fas fa-times"></i></button>
           </div>
           <div className="flex-1 overflow-y-auto p-2">
             {toc.length > 0 ? toc.map((item, idx) => (
               <div key={idx} onClick={() => { rendition?.display(item.href); if(window.innerWidth<768) setSidebarOpen(false); }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm dark:text-gray-300 rounded truncate">
                 {item.label}
               </div>
             )) : <p className="p-4 text-gray-500 text-sm">{t('noChapters', settings.language)}</p>}
           </div>
        </div>

        {/* 阅读容器 */}
        <main className="flex-1 relative bg-white dark:bg-gray-900 flex flex-col overflow-hidden">
           {/* 加载中 */}
           {isLoading && (
             <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 z-10">
               <i className="fas fa-spinner fa-spin text-4xl text-primary"></i>
             </div>
           )}

           <div className="flex-1 relative w-full h-full overflow-hidden">
                <div id="epub-viewer" ref={readerRef} className="w-full h-full"></div>
           </div>

           {/* 翻页区域 */}
           {book && (
             <>
               <button onClick={() => rendition?.prev()} className="absolute left-2 top-1/2 transform -translate-y-1/2 p-4 text-gray-300 hover:text-primary transition-colors z-10 bg-black/5 hover:bg-black/10 rounded-full">
                 <i className="fas fa-chevron-left text-xl"></i>
               </button>
               <button onClick={() => rendition?.next()} className="absolute right-2 top-1/2 transform -translate-y-1/2 p-4 text-gray-300 hover:text-primary transition-colors z-10 bg-black/5 hover:bg-black/10 rounded-full">
                 <i className="fas fa-chevron-right text-xl"></i>
               </button>
             </>
           )}
        </main>
      </div>

      {/* 底部播放器 */}
      {book && (
        <div className="bg-white dark:bg-gray-800 border-t dark:border-gray-700 shrink-0 z-20 h-16 flex items-center px-4 justify-between">
           <div className="text-xs text-gray-500 w-1/4">
             {settings.tts.enabled ? t('customTTS', settings.language) : t('tts', settings.language)}
           </div>
           
           <div className="flex items-center gap-6">
              <button 
                onClick={() => rendition?.prev()} 
                className="text-gray-500 hover:text-primary"
                title={t('prevChap', settings.language)}
              ><i className="fas fa-backward"></i></button>
              
              <button onClick={toggleAudio} className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shadow hover:bg-blue-600">
                <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'}`}></i>
              </button>

              <button 
                onClick={() => rendition?.next()} 
                className="text-gray-500 hover:text-primary"
                title={t('nextChap', settings.language)}
              ><i className="fas fa-forward"></i></button>
           </div>

           <div className="text-xs text-gray-500 w-1/4 text-right">
              {settings.tts.enabled ? `${formatTime(audioCurrentTime)} / ${formatTime(audioDuration)}` : `Page ${currentPage} / ${totalPages}`}
           </div>

           <audio 
              ref={audioRef} 
              onTimeUpdate={handleTimeUpdate} 
              onLoadedMetadata={e => setAudioDuration(e.currentTarget.duration)} 
              onEnded={handleAudioEnded}
              className="hidden"
           />
        </div>
      )}

      {/* 浮动菜单 */}
      <SelectionMenu 
        selection={selection}
        lang={settings.language}
        onLookup={handleLookup}
        onHighlight={handleHighlight}
        onAnki={handleLookup} 
        onClose={() => setSelection(p => ({ ...p, visible: false }))}
      />

      {/* 词典模态框 */}
      {dictModalOpen && (
        <DictionaryModal 
          word={selection.text}
          sentence={selection.sentence}
          results={dictResults}
          isLoading={dictLoading}
          error={dictError}
          onClose={() => setDictModalOpen(false)}
          ankiSettings={ankiSettings}
          lang={settings.language}
          onAddToAnkiWithAudio={getSelectedAudio}
        />
      )}

      {/* 设置面板 */}
      <SettingsPanel 
        isOpen={settingsOpen} 
        onClose={() => setSettingsOpen(false)} 
        settings={settings}
        onSettingsChange={setSettings}
        ankiSettings={ankiSettings}
        onAnkiSettingsChange={setAnkiSettings}
      />
    </div>
  );
};

// 格式化时间辅助函数
function formatTime(sec: number) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s<10?'0':''}${s}`;
}

export default App;
