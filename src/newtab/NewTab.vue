<template>
  <main class="container">
    <!-- 常用网站 -->
    <section class="card">
      <h2>常用网站</h2>
      <div v-if="topSites.length > 0" class="grid-list">
        <a v-for="site in topSites" :key="site.url" :href="site.url" :title="site.title">
          {{ site.title }}
        </a>
      </div>
      <div v-else class="status-message">
        {{ topSitesStatusMessage }}
      </div>
    </section>
    <!-- 书签 -->
    <section class="card">
      <h2>{{ bookmarkFolderName }}</h2>
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
  </main>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import BookmarkNode from '../components/BookmarkNode.vue'

// --- 常用网站状态 ---
const topSites = ref<chrome.topSites.MostVisitedURL[]>([]);
const topSitesStatusMessage = ref('正在加载常用网站...');

// --- 书签状态 ---
// 在这里修改为你想要展示的书签文件夹名称
const bookmarkFolderName = 'Bookmarks bar';
const bookmarkRoot = ref<chrome.bookmarks.BookmarkTreeNode | null>(null);
const bookmarkStatusMessage = ref('正在加载书签...');

// 在组件加载完成后，调用 API 获取数据
onMounted(async () => {
  // 1. 获取常用网站
  try {
    topSites.value = await getTopSites();
    if (topSites.value.length === 0) {
      topSitesStatusMessage.value = '暂无常用网站。';
    }
  } catch (e) {
    topSitesStatusMessage.value = '加载常用网站时出错。';
    console.error(topSitesStatusMessage.value, e);
  }

  // 2. 获取书签
  try {
    const bookmarkTree = await getBookmarksTree();
    const targetFolder = findFolder(bookmarkTree, bookmarkFolderName);

    if (targetFolder) {
      bookmarkRoot.value = targetFolder;
    } else {
      bookmarkStatusMessage.value = `错误: 未找到名为 "${bookmarkFolderName}" 的书签文件夹。`;
    }
  } catch(e) {
    bookmarkStatusMessage.value = '加载书签时出错。';
    console.error(bookmarkStatusMessage.value, e);
  }
})

// 封装成 Promise 更易用
function getTopSites(): Promise<chrome.topSites.MostVisitedURL[]> {
  return new Promise((resolve) => {
    chrome.topSites.get(resolve);
  });
}

function getBookmarksTree(): Promise<chrome.bookmarks.BookmarkTreeNode[]> {
  return new Promise((resolve) => {
    chrome.bookmarks.getTree(resolve);
  });
}

/**
 * 在书签树中递归查找指定名称的文件夹
 */
function findFolder(nodes: chrome.bookmarks.BookmarkTreeNode[], name: string): chrome.bookmarks.BookmarkTreeNode | null {
  for (const node of nodes) {
    // 如果是文件夹且名称匹配 (忽略大小写)
    if (node.children && node.title.toLowerCase() === name.toLowerCase()) {
      return node;
    }
    // 如果当前节点是文件夹，则递归到其子节点中查找
    if (node.children) {
      const found = findFolder(node.children, name);
      if (found) return found;
    }
  }
  return null;
}
</script>

<style scoped>
/* 建议将全局样式（如字体、背景）移至全局 CSS 文件 */
.container {
  display: flex;
  gap: 2rem;
  padding: 2rem;
  width: 100%;
  box-sizing: border-box;
  min-height: 100vh;
}

.card {
  flex: 1;
  background-color: rgba(255, 255, 255, 0.1); /* 半透明卡片背景 */
  backdrop-filter: blur(10px); /* 毛玻璃效果 */
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  align-self: flex-start;
  color: white;
}

h2 {
  text-align: left;
  margin-top: 0;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.3);
  text-shadow: 0 1px 2px rgba(0,0,0,0.2);
}

.grid-list a, .status-message {
  font-size: 0.9rem;
  color: #f0f0f0;
  text-decoration: none;
  display: block;
  padding: 10px;
  border-radius: 6px;
  background-color: rgba(0, 0, 0, 0.2);
  margin-bottom: 8px;
  transition: background-color 0.2s, transform 0.2s;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.grid-list a:hover {
  background-color: rgba(0, 0, 0, 0.4);
  transform: translateY(-2px);
}

.bookmark-list ul {
  padding-left: 0;
  list-style: none;
}

.status-message {
  background-color: transparent;
}

.error {
  color: #ff8a80; /* 更柔和的红色 */
}
</style>
