<template>
  <main class="container">
    <!-- 左侧栏 -->
    <div class="column">
      <section class="card">
        <h2>快捷访问</h2>
        <CollapsibleSection title="常用网站">
          <div v-if="topSites.length > 0" class="grid-list">
            <a v-for="site in topSites" :key="site.url" :href="site.url" :title="site.title">
              {{ site.title }}
            </a>
          </div>
          <div v-else class="status-message">
            {{ topSitesStatusMessage }}
          </div>
        </CollapsibleSection>
        <CollapsibleSection title="最近关闭">
          <div v-if="recentlyClosedTabs.length > 0" class="grid-list">
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
      <!-- 书签 -->
      <section class="card">
        <h2 v-if="bookmarkRoot">{{ bookmarkRoot.title }}</h2>
        <h2 v-else>书签</h2>
        <div v-if="bookmarkRoot" class="bookmark-list">
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
import { ref, onMounted } from 'vue'
import BookmarkNode from '../components/BookmarkNode.vue'
import CollapsibleSection from '../components/CollapsibleSection.vue' // 导入新组件

// --- 状态定义 ---
const topSites = ref<chrome.topSites.MostVisitedURL[]>([]);
const topSitesStatusMessage = ref('正在加载...');

const recentlyClosedTabs = ref<{title?: string; url?: string; sessionId?: string}[]>([]);
const recentlyClosedStatusMessage = ref('正在加载...');

const bookmarkRoot = ref<chrome.bookmarks.BookmarkTreeNode | null>(null);
const bookmarkStatusMessage = ref('正在加载...');

// --- 生命周期钩子 ---
onMounted(async () => {
  loadTopSites();
  loadRecentlyClosedTabs();
  loadSelectedBookmarkFolder();
});

// --- 数据加载函数 ---
async function loadTopSites() {
  try {
    topSites.value = await chrome.topSites.get();
    if (topSites.value.length === 0) topSitesStatusMessage.value = '暂无常用网站。';
  } catch (e) {
    topSitesStatusMessage.value = '加载常用网站出错。';
    console.error(e);
  }
}

async function loadRecentlyClosedTabs() {
  try {
    const sessions = await chrome.sessions.getRecentlyClosed({ maxResults: 25 });
    const tabs = sessions
      .filter(session => session.tab && !session.window)
      .map(session => session.tab as chrome.tabs.Tab)
      .filter(tab => tab.title && tab.url);
    
    recentlyClosedTabs.value = tabs;
    if (tabs.length === 0) recentlyClosedStatusMessage.value = '暂无最近关闭的标签页。';

  } catch (e) {
    recentlyClosedStatusMessage.value = '加载最近关闭的标签页出错。';
    console.error(e);
  }
}

async function loadSelectedBookmarkFolder() {
  try {
    const data = await chrome.storage.local.get('selectedBookmarkFolderId');
    let folderId = data.selectedBookmarkFolderId;

    if (!folderId) {
      const bookmarkTree = await chrome.bookmarks.getTree();
      const defaultFolder = findFolderByName(bookmarkTree, 'Bookmarks bar');
      if (defaultFolder) folderId = defaultFolder.id;
    }

    if (folderId) {
      const [bookmarkTree] = await chrome.bookmarks.getSubTree(folderId);
      if (bookmarkTree) {
        bookmarkRoot.value = bookmarkTree;
      } else {
        bookmarkStatusMessage.value = '无法找到所选文件夹。';
      }
    } else {
      bookmarkStatusMessage.value = '请在扩展弹出窗口中选择一个书签文件夹。';
    }
  } catch(e) {
    bookmarkStatusMessage.value = '加载书签出错。';
    console.error(e);
  }
}

// --- 辅助函数 ---
function findFolderByName(nodes: chrome.bookmarks.BookmarkTreeNode[], name: string): chrome.bookmarks.BookmarkTreeNode | null {
  for (const node of nodes) {
    if (node.children && node.title.toLowerCase() === name.toLowerCase()) return node;
    if (node.children) {
      const found = findFolderByName(node.children, name);
      if (found) return found;
    }
  }
  return null;
}

function restoreTab(sessionId?: string) {
  if (sessionId) {
    chrome.sessions.restore(sessionId);
  }
}
</script>

<style scoped>
.container {
  display: flex;
  gap: 2rem;
  padding: 2rem;
  width: 100%;
  box-sizing: border-box;
  min-height: 100vh;
  align-items: flex-start;
}

.column {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.card {
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
  text-overflow: ellipsis;
  cursor: pointer;
}

.grid-list a:hover {
  background-color: rgba(0, 0, 0, 0.6);
  transform: translateY(-2px);
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
