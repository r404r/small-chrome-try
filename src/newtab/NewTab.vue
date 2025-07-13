<template>
  <main class="container">
    <section class="card content-card">
      <h2>Top site</h2>
      <div class="grid-list">
        <a v-for="site in topSites" :key="site.url" :href="site.url">
          {{  site.title }}
        </a>
      </div>
    </section>
    <section class="card content-card">
      <div class="content-wrapper">
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
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import BookmarkNode from '../components/BookmarkNode.vue'

const link = ref('https://github.com/r404r/')

const getTime = () => {
  const date = new Date()
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${hour}:${minute}`
}

let time = ref(getTime())
let intervalor: any = null

// --- 书签状态 ---
// 在这里修改为你想要展示的书签文件夹名称
const bookmarkFolderName = 'Bookmarks bar';
const bookmarkRoot = ref<chrome.bookmarks.BookmarkTreeNode | null>(null);
const bookmarkStatusMessage = ref('正在加载书签...');

// 2. 在组件加载完成后，调用 API 获取数据
onMounted( async() => {
  intervalor = setInterval(() => {
    time.value = getTime()
  }, 1000)

  try {
    topSites.value = await getTopSites();
  } catch (e) {
    console.error('get mostly access site error: ', e);
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

onUnmounted(() => {
  clearInterval(intervalor)
})

// 1. 定义一个响应式变量来存储网站列表
const topSites = ref<chrome.topSites.MostVisitedURL[]>([]);

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
:root {
  font-family:
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    Oxygen,
    Ubuntu,
    Cantarell,
    'Open Sans',
    'Helvetica Neue',
    sans-serif;

  color-scheme: light dark;
  box-sizing: border-box;
}

body {
  min-width: 20rem;
  margin: 0;
  /* 横向滚动来切换卡片 */
  display: flex;
  width: 300vw; /* 3个 section，所以是 300vw */
}

section::before {
  content: '';
  position: fixed;
  z-index: -1;
  width: 100vw;
  height: 100vh;
  background-image: url('https://source.unsplash.com/random');
  background-size: cover;
  filter: blur(10px);
}

section {
  width: 100vw;
  height: 200vh;

  display: flex;
  flex-direction: column;
  justify-content: center; /* 垂直居中 */
  align-items: center;
  padding: 2rem;
}
h1 {
  color: white;
  text-shadow: 0 0 15px rgba(0,0,0,0.5);
  text-transform: uppercase;
  font-size: 6rem;
  margin: 2rem auto;
}

.author-link {
  font-size: 1rem;
  margin: 0.5rem;
  color: #cccccc;
  text-decoration: none;
  position: absolute;
  bottom: 2rem;
}

.content-card {
  justify-content: flex-start; /* 内容区从顶部开始 */
  padding-top: 5rem;
}

.content-wrapper {
  max-width: 600px;
  width: 100%;
  background-color: rgba(0, 0, 0, 0.3);
  padding: 1.5rem 2rem;
  border-radius: 12px;
}

.container {
  display: flex;
  gap: 2em;
  padding: 2em;
  background-color: #f0f2f5;
  min-height: 100vh;
  box-sizing: border-box;
}

.card {
  background-color: #ffffff;
  padding: 1.5em;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  flex: 1;
  align-self: flex-start; /* 避免卡片被拉伸 */
}

h2 {
  color: white;
  text-align: left;
  margin-top: 0;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.3);
}

.grid-list a, .status-message {
  font-size: 1rem;
  color: #f0f0f0;
  text-decoration: none;
  display: block;
  padding: 8px;
  border-radius: 4px;
  background-color: rgba(0, 0, 0, 0.2);
  margin-bottom: 8px;
  transition: background-color 0.2s;
}

.grid-list a:hover {
  background-color: rgba(0, 0, 0, 0.4);
}

.bookmark-list ul {
  padding-left: 0;
}

.folder-list ul {
  padding-left: 0;
}

.error {
  color: #d9534f;
}
</style>
