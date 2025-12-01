# 项目文件结构说明

本文档描述了 React EPUB Reader 项目的文件结构及其功能。

## 根目录文件

*   **`index.html`**: 应用的入口 HTML 文件。包含 Tailwind CSS CDN 引入、全局样式定义以及 React 应用挂载点。
*   **`index.tsx`**: React 应用的入口文件。负责渲染 `App` 组件到 DOM 中。
*   **`App.tsx`**: 核心应用程序组件。包含主要的应用状态管理（书架/阅读器视图切换、书籍加载、阅读器渲染）、事件监听（TTS播放、文本选择）以及主要的 UI 布局。
*   **`types.ts`**: TypeScript 类型定义文件。定义了 `Book` (书籍), `AppSettings` (应用设置), `AnkiSettings` (Anki设置) 等核心接口。
*   **`vite.config.ts`**: Vite 构建工具的配置文件。配置了 GitHub Pages 部署路径、别名等。
*   **`metadata.json`**: 项目元数据描述。

## 目录结构

### `/components` - UI 组件
*   **`SettingsPanel.tsx`**: 设置面板组件。管理语言、外观、音频、Anki连接等设置项。
*   **`DictionaryModal.tsx`**: 词典弹窗组件。显示查词结果并提供添加到 Anki 的功能。
*   **`SelectionMenu.tsx`**: 文本选中后的悬浮菜单。提供查词、高亮、Anki 制卡等快捷操作。

### `/services` - 业务逻辑服务
*   **`storageService.ts`**: 本地存储服务。使用 IndexedDB 存储书籍文件（二进制）和元数据（阅读进度、封面），支持增删改查。
*   **`ankiService.ts`**: Anki 集成服务。负责与 AnkiConnect 插件通信，获取牌组/模板列表、添加笔记、存储媒体文件。
*   **`dictionaryService.ts`**: 词典服务。调用外部 API 获取单词释义。
*   **`ttsService.ts`**: TTS 服务。处理自定义 TTS 服务器的请求逻辑。

### `/utils` - 工具函数
*   **`i18n.ts`**: 国际化资源文件。包含中文和英文的翻译字符串。
*   **`audioHelper.ts`**: 音频处理工具。用于切割 AudioBuffer 或格式转换（如生成 WAV 格式用于 Anki 导入）。
*   **`smilParser.ts`**: SMIL 解析工具。用于处理 EPUB 中的同步媒体文件（如果有）。

### `/.github/workflows` - CI/CD
*   **`deploy.yml`**: GitHub Actions 配置文件。用于自动构建项目并部署到 GitHub Pages。
