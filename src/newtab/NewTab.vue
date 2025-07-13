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
  </main>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import BookmarkNode from '../components/BookmarkNode.vue'

// --- 常用网站状态 ---
const topSites = ref<chrome.topSites.MostVisitedURL[]>([]);
const topSitesStatusMessage = ref('正在加载常用网站...');

// --- 书签状态 ---
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

  // 2. 获取用户选择的书签文件夹
  loadSelectedBookmarkFolder();
});

async function loadSelectedBookmarkFolder() {
  try {
    const data = await chrome.storage.local.get('selectedBookmarkFolderId');
    const folderId = data.selectedBookmarkFolderId;

    if (folderId) {
      const bookmarkTree = await chrome.bookmarks.getSubTree(folderId);
      if (bookmarkTree && bookmarkTree.length > 0) {
        bookmarkRoot.value = bookmarkTree[0];
      } else {
        bookmarkStatusMessage.value = '无法找到所选文件夹，请在弹出窗口中重新选择。';
      }
    } else {
      bookmarkStatusMessage.value = '请点击浏览器右上角的扩展图标，在弹出窗口中选择要显示的书签文件夹。';
    }
  } catch(e) {
    bookmarkStatusMessage.value = '加载书签时出错。';
    console.error(bookmarkStatusMessage.value, e);
  }
}

// 封装成 Promise 更易用
function getTopSites(): Promise<chrome.topSites.MostVisitedURL[]> {
  return new Promise((resolve) => {
    chrome.topSites.get(resolve);
  });
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
  /* 增强文本阴影以提高在任何背景下的可读性 */
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
}

.error {
  color: #ff8a80; /* 更柔和的红色 */
}
</style>
