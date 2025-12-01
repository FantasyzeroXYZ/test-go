
import { LibraryBook } from '../types';

const DB_NAME = 'ReactEpubReaderDB';
const DB_VERSION = 2; // 升级版本
const STORE_LIBRARY = 'library'; // 仅存储元数据
const STORE_CONTENT = 'content'; // 仅存储二进制文件

// 打开数据库
const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            
            // 创建元数据存储 (如果不存在)
            if (!db.objectStoreNames.contains(STORE_LIBRARY)) {
                const store = db.createObjectStore(STORE_LIBRARY, { keyPath: 'id' });
                store.createIndex('addedAt', 'addedAt', { unique: false });
            }

            // 创建内容存储 (如果不存在) - 版本2新增
            if (!db.objectStoreNames.contains(STORE_CONTENT)) {
                db.createObjectStore(STORE_CONTENT, { keyPath: 'id' });
            }
        };
    });
};

// 添加书籍 (分离存储)
export const addBook = async (book: LibraryBook): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_LIBRARY, STORE_CONTENT], 'readwrite');
        
        // 1. 存储元数据 (剔除 data)
        const libraryStore = transaction.objectStore(STORE_LIBRARY);
        const { data, ...metadata } = book;
        const metaRequest = libraryStore.put(metadata);

        // 2. 存储内容
        const contentStore = transaction.objectStore(STORE_CONTENT);
        const contentRequest = contentStore.put({ id: book.id, data: book.data });

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        
        // 也可以单独监听请求错误
        metaRequest.onerror = () => reject(metaRequest.error);
        contentRequest.onerror = () => reject(contentRequest.error);
    });
};

// 获取书架列表 (只读 library store，速度快)
export const getLibraryList = async (): Promise<LibraryBook[]> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_LIBRARY, 'readonly');
        const store = transaction.objectStore(STORE_LIBRARY);
        const request = store.getAll();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const books = request.result as LibraryBook[];
            // 按添加时间倒序
            books.sort((a, b) => b.addedAt - a.addedAt);
            resolve(books);
        };
    });
};

// 获取单本书籍的完整数据 (合并元数据和内容)
export const getBookData = async (id: string): Promise<LibraryBook | undefined> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_LIBRARY, STORE_CONTENT], 'readonly');
        
        const libStore = transaction.objectStore(STORE_LIBRARY);
        const contentStore = transaction.objectStore(STORE_CONTENT);

        let metadata: LibraryBook | undefined;
        let contentData: { id: string, data: ArrayBuffer } | undefined;

        // 获取元数据
        const metaReq = libStore.get(id);
        metaReq.onsuccess = () => {
            metadata = metaReq.result;
        };

        // 获取内容
        const contentReq = contentStore.get(id);
        contentReq.onsuccess = () => {
            contentData = contentReq.result;
        };

        transaction.oncomplete = () => {
            if (metadata && contentData) {
                resolve({ ...metadata, data: contentData.data });
            } else {
                resolve(undefined);
            }
        };

        transaction.onerror = () => reject(transaction.error);
    });
};

// 更新书籍进度 (只更新 library store)
export const updateBookProgress = async (id: string, cfi: string): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_LIBRARY, 'readwrite');
        const store = transaction.objectStore(STORE_LIBRARY);
        const getReq = store.get(id);

        getReq.onerror = () => reject(getReq.error);
        getReq.onsuccess = () => {
            const book = getReq.result as LibraryBook;
            if (book) {
                book.progressCfi = cfi;
                const putReq = store.put(book);
                putReq.onerror = () => reject(putReq.error);
                putReq.onsuccess = () => resolve();
            } else {
                reject(new Error('Book not found'));
            }
        };
    });
};

// 删除书籍 (同时删除元数据和内容)
export const deleteBook = async (id: string): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_LIBRARY, STORE_CONTENT], 'readwrite');
        
        transaction.objectStore(STORE_LIBRARY).delete(id);
        transaction.objectStore(STORE_CONTENT).delete(id);

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
};
