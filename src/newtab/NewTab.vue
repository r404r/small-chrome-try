<template>
  <!-- 主容器，采用 flex 布局 -->
  <main class="container">
    <!-- 左侧栏 -->
    <div class="column">
      <!-- “快捷访问”卡片，包含了两个可折叠区域 -->
      <section class="card">
        <h2>快捷访问</h2>
        <!-- “常用网站”折叠区 -->
        <CollapsibleSection title="常用网站">
          <!-- v-if / v-else 用于条件渲染：当有数据时显示列表，否则显示状态消息 -->
          <div v-if="topSites.length > 0" class="grid-list">
            <!-- v-for 用于遍历 topSites 数组，为每个网站创建一个链接 -->
            <a v-for="site in topSites" :key="site.url" :href="site.url" :title="site.title">
              {{ site.title }}
            </a>
          </div>
          <div v-else class="status-message">
            {{ topSitesStatusMessage }}
          </div>
        </CollapsibleSection>
        <!-- “最近关闭”折叠区 -->
        <CollapsibleSection title="最近关闭">
          <div v-if="recentlyClosedTabs.length > 0" class="grid-list">
            <!-- @click.prevent 会阻止链接的默认跳转行为，改为调用我们自己的 restoreTab 函数 -->
            <a v-for="tab in recentlyClosedTabs" :key="tab.sessionId" :href="tab.url" :title="tab.title" @click.prevent="restoreTab(tab.sessionId)">
              {{ tab.title }}
            </a>
          </div>
          <div v-else class="status-message">
            {{ recentlyClosedStatusMessage }}
          </div>
        </CollapsibleSection>
      </section>
    </div>
    <!-- 右侧栏 -->
    <div class="column">
      <!-- “书签”卡片 -->
      <section class="card">
        <!-- 动态标题：如果加载了书签文件夹，标题就是文件夹名，否则默认为“书签” -->
        <h2 v-if="bookmarkRoot">{{ bookmarkRoot.title }}</h2>
        <h2 v-else>书签</h2>
        <div v-if="bookmarkRoot" class="bookmark-list">
          <!-- 递归组件 BookmarkNode 用于展示树状的书签结构 -->
          <ul>
            <BookmarkNode
              v-for="node in bookmarkRoot.children"
              :key="node.id"
              :node="node"
            />
          </ul>
        </div>
        <div v-else class="status-message">
          {{ bookmarkStatusMessage }}
        </div>
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
// 从 'vue' 导入核心的响应式 API 和生命周期钩子
import { ref, onMounted } from 'vue'
// 导入子组件
import BookmarkNode from '../components/BookmarkNode.vue'
import CollapsibleSection from '../components/CollapsibleSection.vue'

// --- 响应式状态定义 ---
// 使用 ref() 创建响应式变量。当这些变量的值改变时，Vue 会自动更新模板中用到它们的部分。

// 存储“常用网站”列表
const topSites = ref<chrome.topSites.MostVisitedURL[]>([]);
// “常用网站”区域的状态消息（如“加载中...”、“暂无...”）
const topSitesStatusMessage = ref('加载中...');

// 存储“最近关闭”的标签页列表
const recentlyClosedTabs = ref<{title?: string; url?: string; sessionId?: string}[]>([]);
const recentlyClosedStatusMessage = ref('加载中...');

// 存储当前要展示的书签文件夹的根节点
const bookmarkRoot = ref<chrome.bookmarks.BookmarkTreeNode | null>(null);
const bookmarkStatusMessage = ref('加载中...');

// --- 生命周期钩子 ---
// onMounted() 会在组件第一次挂载到 DOM 后执行。
// 这里是执行初始化操作（如从 API 获取数据）的理想位置。
onMounted(async () => {
  // 并行发起所有数据加载请求
  loadTopSites();
  loadRecentlyClosedTabs();
  loadSelectedBookmarkFolder();
});

// --- 数据加载函数 ---

/**
 * @description 调用 chrome.topSites API 获取常用网站列表
 */
async function loadTopSites() {
  try {
    topSites.value = await chrome.topSites.get();
    if (topSites.value.length === 0) topSitesStatusMessage.value = '暂无常用网站。';
  } catch (e) {
    topSitesStatusMessage.value = '加载常用网站出错。';
    console.error(e);
  }
}

/**
 * @description 调用 chrome.sessions API 获取最近关闭的标签页
 */
async function loadRecentlyClosedTabs() {
  try {
    // 获取最近的会话，为了过滤，我们请求稍多一些
    const sessions = await chrome.sessions.getRecentlyClosed({ maxResults: 25 });
    const tabs = sessions
      .filter(session => session.tab && !session.window) // 只保留单个标签页的会话（排除整个窗口的会话）
      .map(session => session.tab as chrome.tabs.Tab)   // 提取出 tab 对象
      .filter(tab => tab.title && tab.url);              // 只保留有标题和 URL 的有效标签页
    
    recentlyClosedTabs.value = tabs;
    if (tabs.length === 0) recentlyClosedStatusMessage.value = '暂无最近关闭的标签页。';

  } catch (e) {
    recentlyClosedStatusMessage.value = '加载最近关闭的标签页出错。';
    console.error(e);
  }
}

/**
 * @description 加载用户选择的书签文件夹，如果未选择，则加载默认文件夹
 */
async function loadSelectedBookmarkFolder() {
  try {
    // 1. 从本地存储中获取用户之前保存的文件夹 ID
    const data = await chrome.storage.local.get('selectedBookmarkFolderId');
    let folderId = data.selectedBookmarkFolderId;

    // 2. 如果没有找到 ID（比如是第一次使用），则查找名为 "Bookmarks bar" 的文件夹作为默认值
    if (!folderId) {
      const bookmarkTree = await chrome.bookmarks.getTree();
      const defaultFolder = findFolderByName(bookmarkTree, 'Bookmarks bar');
      if (defaultFolder) folderId = defaultFolder.id;
    }

    // 3. 如果最终我们有了一个文件夹 ID（无论是用户选择的还是默认的）
    if (folderId) {
      // 使用 chrome.bookmarks.getSubTree 直接获取该文件夹的内容
      const [bookmarkTree] = await chrome.bookmarks.getSubTree(folderId);
      if (bookmarkTree) {
        bookmarkRoot.value = bookmarkTree;
      } else {
        bookmarkStatusMessage.value = '无法找到所选文件夹。';
      }
    } else {
      // 4. 如果连默认文件夹都找不到，则提示用户去设置
      bookmarkStatusMessage.value = '请在扩展弹出窗口中选择一个书签文件夹。';
    }
  } catch(e) {
    bookmarkStatusMessage.value = '加载书签出错。';
    console.error(e);
  }
}

// --- 辅助函数 ---

/**
 * @description 在书签树中递归地按名称查找文件夹
 * @param nodes 当前要搜索的节点数组
 * @param name 要查找的文件夹名称
 * @returns 找到的文件夹节点，或 null
 */
function findFolderByName(nodes: chrome.bookmarks.BookmarkTreeNode[], name: string): chrome.bookmarks.BookmarkTreeNode | null {
  for (const node of nodes) {
    // 如果是文件夹且名称匹配（忽略大小写）
    if (node.children && node.title.toLowerCase() === name.toLowerCase()) return node;
    // 如果当前节点是文件夹，则递归到其子节点中继续查找
    if (node.children) {
      const found = findFolderByName(node.children, name);
      if (found) return found; // 如果在子节点中找到了，就立刻返回
    }
  }
  return null; // 遍历完所有节点都没找到，返回 null
}

/**
 * @description 调用 chrome.sessions API 恢复指定的标签页
 * @param sessionId 要恢复的会话的 ID
 */
function restoreTab(sessionId?: string) {
  if (sessionId) {
    chrome.sessions.restore(sessionId);
  }
}
</script>

<style scoped>
/* :scoped 确保这里的样式只对当前组件生效，不会污染其他组件 */
.container {
  display: flex;
  gap: 2rem;
  padding: 2rem;
  width: 100%;
  box-sizing: border-box;
  min-height: 100vh;
  align-items: flex-start; /* 让列从顶部对齐 */
}

.column {
  flex: 1; /* 每列占据一半空间 */
  display: flex;
  flex-direction: column;
  gap: 2rem; /* 列内卡片之间的间距 */
}

.card {
  /* 毛玻璃效果的关键样式 */
  background-color: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(8px);
  
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.25);
  color: white;
}

h2 {
  text-align: left;
  margin-top: 0;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.3);
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.7);
}

.grid-list a, .status-message {
  font-size: 0.9rem;
  color: #fff;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
  text-decoration: none;
  display: block;
  padding: 10px;
  border-radius: 6px;
  background-color: rgba(0, 0, 0, 0.4);
  margin-bottom: 8px;
  transition: background-color 0.2s, transform 0.2s;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis; /* 超出部分显示省略号 */
  cursor: pointer;
}

.grid-list a:hover {
  background-color: rgba(0, 0, 0, 0.6);
  transform: translateY(-2px); /* 鼠标悬浮时轻微上移 */
}

.bookmark-list ul {
  padding-left: 0;
  list-style: none;
}

.status-message {
  background-color: transparent;
  line-height: 1.5;
  cursor: default;
}
</style>
