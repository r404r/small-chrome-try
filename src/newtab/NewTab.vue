<template>
  <!-- 主容器，采用 flex 布局 -->
  <main class="container">
    <!-- 左侧栏 -->
    <div class="column">
      <!-- "快捷访问"卡片，包含了两个可折叠区域 -->
      <section class="card">
        <h2>快捷访问</h2>
        <!-- "常用网站"折叠区 -->
        <CollapsibleSection title="常用网站" storageKey="topSitesExpanded">
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
        <!-- "最近访问"折叠区 -->
        <CollapsibleSection title="最近访问" storageKey="recentHistoryExpanded">
          <div v-if="recentHistory.length > 0" class="grid-list">
            <a v-for="item in recentHistory" :key="item.id" :href="item.url" :title="item.title">
              {{ item.title }}
            </a>
          </div>
          <div v-else class="status-message">
            {{ recentHistoryStatusMessage }}
          </div>
        </CollapsibleSection>
      </section>
    </div>
    <!-- 右侧栏 -->
    <div class="column">
      <!-- "书签"卡片 -->
      <section class="card">
        <!-- 动态标题：如果加载了书签文件夹，标题就是文件夹名，否则默认为"书签" -->
        <h2 v-if="bookmarkRoot">{{ bookmarkRoot.title }}</h2>
        <h2 v-else>书签</h2>
        <div v-if="bookmarkRoot" class="bookmark-list">
          <!-- 递归组件 BookmarkNode 用于展示树状的书签结构 -->
          <ul>
            <BookmarkNode 
              v-for="node in bookmarkRoot.children" 
              :key="node.id" 
              :node="node" 
              @editBookmark="handleEditBookmark"
            />
          </ul>
        </div>
        <div v-else class="status-message">
          {{ bookmarkStatusMessage }}
        </div>
      </section>
    </div>
    
    <!-- 编辑书签模态框 -->
    <BookmarkEditModal
      :isVisible="isEditModalVisible"
      :bookmark="editingBookmark"
      @close="closeEditModal"
      @save="saveBookmark"
      @delete="deleteBookmark"
    />
  </main>
</template>

<script setup lang="ts">
// 从 'vue' 导入核心的响应式 API 和生命周期钩子
import { ref, onMounted } from 'vue'
// 导入子组件
import BookmarkNode from '../components/BookmarkNode.vue'
import CollapsibleSection from '../components/CollapsibleSection.vue'
import BookmarkEditModal from '../components/BookmarkEditModal.vue'

// --- 响应式状态定义 ---
// 使用 ref() 创建响应式变量。当这些变量的值改变时，Vue 会自动更新模板中用到它们的部分。

// 存储"常用网站"列表
const topSites = ref<chrome.topSites.MostVisitedURL[]>([]);
// "常用网站"区域的状态消息（如"加载中..."、"暂无..."）
const topSitesStatusMessage = ref('加载中...');

// 存储"最近访问"的历史记录列表
const recentHistory = ref<chrome.history.HistoryItem[]>([]);
const recentHistoryStatusMessage = ref('加载中...');

// 存储当前要展示的书签文件夹的根节点
const bookmarkRoot = ref<chrome.bookmarks.BookmarkTreeNode | null>(null);
const bookmarkStatusMessage = ref('加载中...');

// 编辑书签相关状态
const isEditModalVisible = ref(false);
const editingBookmark = ref<chrome.bookmarks.BookmarkTreeNode | null>(null);

// --- 生命周期钩子 ---
// onMounted() 会在组件第一次挂载到 DOM 后执行。
// 这里是执行初始化操作（如从 API 获取数据）的理想位置。
onMounted(async () => {
  // 并行发起所有数据加载请求
  loadTopSites();
  loadRecentHistory();
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
 * @description 调用 chrome.history API 获取最近访问的网站
 */
async function loadRecentHistory() {
  try {
    // 获取更多的历史记录，以便去重后仍有足够的数据
    const historyItems = await chrome.history.search({
      text: '',
      maxResults: 50, // 增加获取数量，为去重留出空间
      startTime: Date.now() - 7 * 24 * 60 * 60 * 1000 // 最近7天
    });

    // 过滤掉没有标题或URL的项目，并排除当前新标签页
    const filteredItems = historyItems
      .filter(item => item.title && item.url && !item.url.includes('chrome://') && !item.url.includes('chrome-extension://'));

    // 使用 Map 来去重，保留每个标题的最新记录（最大的 lastVisitTime）
    const uniqueItemsMap = new Map<string, chrome.history.HistoryItem>();

    filteredItems.forEach(item => {
      const title = item.title!;
      const existingItem = uniqueItemsMap.get(title);

      // 如果没有相同标题的记录，或者当前记录更新，则保存当前记录
      if (!existingItem || (item.lastVisitTime && existingItem.lastVisitTime && item.lastVisitTime > existingItem.lastVisitTime)) {
        uniqueItemsMap.set(title, item);
      }
    });

    // 将去重后的结果转换为数组，按访问时间排序，取前10个
    const uniqueItems = Array.from(uniqueItemsMap.values())
      .sort((a, b) => (b.lastVisitTime || 0) - (a.lastVisitTime || 0))
      .slice(0, 10);

    recentHistory.value = uniqueItems;
    if (uniqueItems.length === 0) recentHistoryStatusMessage.value = '暂无最近访问记录。';
  } catch (e) {
    recentHistoryStatusMessage.value = '加载最近访问记录出错。';
    console.error('Error loading recent history:', e);
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
  } catch (e) {
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

// --- 编辑书签功能 ---

/**
 * @description 处理编辑书签事件
 * @param node 要编辑的书签节点
 */
function handleEditBookmark(node: chrome.bookmarks.BookmarkTreeNode) {
  editingBookmark.value = node;
  isEditModalVisible.value = true;
}

/**
 * @description 关闭编辑模态框
 */
function closeEditModal() {
  isEditModalVisible.value = false;
  editingBookmark.value = null;
}

/**
 * @description 保存书签编辑
 * @param bookmarkData 编辑后的书签数据
 */
async function saveBookmark(bookmarkData: { id: string; title: string; url: string }) {
  try {
    // 使用 Chrome 书签 API 更新书签
    await chrome.bookmarks.update(bookmarkData.id, {
      title: bookmarkData.title,
      url: bookmarkData.url
    });

    // 更新本地状态中的书签数据
    updateBookmarkInTree(bookmarkRoot.value, bookmarkData.id, bookmarkData.title, bookmarkData.url);

    // 关闭模态框
    closeEditModal();

    console.log('书签更新成功');
  } catch (error) {
    console.error('更新书签失败:', error);
    alert('更新书签失败，请重试。');
  }
}

/**
 * @description 删除书签
 * @param bookmarkId 要删除的书签ID
 */
async function deleteBookmark(bookmarkId: string) {
  try {
    // 使用 Chrome 书签 API 删除书签
    await chrome.bookmarks.remove(bookmarkId);

    // 从本地状态中移除书签
    removeBookmarkFromTree(bookmarkRoot.value, bookmarkId);

    // 关闭模态框
    closeEditModal();

    console.log('书签删除成功');
  } catch (error) {
    console.error('删除书签失败:', error);
    alert('删除书签失败，请重试。');
  }
}

/**
 * @description 在书签树中递归更新指定书签的信息
 * @param node 当前节点
 * @param id 要更新的书签ID
 * @param title 新标题
 * @param url 新URL
 */
function updateBookmarkInTree(
  node: chrome.bookmarks.BookmarkTreeNode | null, 
  id: string, 
  title: string, 
  url: string
): boolean {
  if (!node) return false;

  // 如果找到了目标书签，更新它
  if (node.id === id) {
    node.title = title;
    node.url = url;
    return true;
  }

  // 如果当前节点有子节点，递归搜索
  if (node.children) {
    for (const child of node.children) {
      if (updateBookmarkInTree(child, id, title, url)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * @description 在书签树中递归移除指定书签
 * @param node 当前节点
 * @param id 要移除的书签ID
 */
function removeBookmarkFromTree(
  node: chrome.bookmarks.BookmarkTreeNode | null, 
  id: string
): boolean {
  if (!node || !node.children) return false;

  // 在当前节点的子节点中查找要删除的书签
  const index = node.children.findIndex(child => child.id === id);
  if (index !== -1) {
    // 找到了，从数组中移除
    node.children.splice(index, 1);
    return true;
  }

  // 如果没找到，递归搜索子文件夹
  for (const child of node.children) {
    if (removeBookmarkFromTree(child, id)) {
      return true;
    }
  }

  return false;
}
</script>

<style scoped>
/* :scoped 确保这里的样式只对当前组件生效，不会污染其他组件 */
.container {
  display: flex;
  gap: 2rem;
  padding: 1rem 2rem;
  max-width: 100vw;
  box-sizing: border-box;
  min-height: 100vh;
  align-items: flex-start;
  overflow-x: hidden;
}

.column {
  flex: 1 1 50%;
  max-width: calc(50% - 1rem);
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  overflow: hidden;
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

.grid-list a,
.status-message {
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
  /* 超出部分显示省略号 */
  cursor: pointer;
}

.grid-list a:hover {
  background-color: rgba(0, 0, 0, 0.6);
  transform: translateY(-2px);
  /* 鼠标悬浮时轻微上移 */
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
