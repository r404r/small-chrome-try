<template>
  <main>
    <h3>选择书签文件夹</h3>
    <p>请选择一个你想在新标签页中展示的书签文件夹。</p>
    <div class="setting-item">
      <label for="bookmark-folder-select">书签文件夹:</label>
      <!-- 
        下拉选择器 <select>
        - v-model="selectedFolderId" 将选择器的值与脚本中的 selectedFolderId 变量双向绑定。
        - @change="saveSelection" 监听值变化事件，当用户做出新选择时调用 saveSelection 函数。
      -->
      <select id="bookmark-folder-select" v-model="selectedFolderId" @change="saveSelection">
        <!-- 禁用的默认选项 -->
        <option disabled value="">请选择...</option>
        <!-- 使用 v-for 遍历 bookmarkFolders 数组，为每个文件夹生成一个 <option> -->
        <option v-for="folder in bookmarkFolders" :key="folder.id" :value="folder.id">
          {{ folder.title }}
        </option>
      </select>
    </div>
    <!-- 用于显示“已保存”等状态消息 -->
    <div v-if="statusMessage" class="status-message">{{ statusMessage }}</div>
  </main>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

// 定义一个接口，用于规范文件夹对象的类型
interface BookmarkFolder {
  id: string;
  title: string;
}

// --- 响应式状态定义 ---
// 存储所有书签文件夹的列表，用于渲染下拉选项
const bookmarkFolders = ref<BookmarkFolder[]>([]);
// 存储用户当前选择的文件夹 ID
const selectedFolderId = ref<string>('');
// 用于向用户显示操作状态（如“已保存”）
const statusMessage = ref('');

/**
 * @description 递归地遍历书签树，提取所有文件夹，并构建它们的完整路径作为标题。
 * @param nodes - 当前遍历的书签节点数组。
 * @param path - 到达当前节点的路径字符串。
 * @param allFolders - 用于收集结果的数组。
 */
function findFolders(nodes: chrome.bookmarks.BookmarkTreeNode[], path: string, allFolders: BookmarkFolder[]) {
  for (const node of nodes) {
    // 如果节点有 children 属性，说明它是一个文件夹
    if (node.children) {
      // 构建带层级关系的路径，例如 "父文件夹 / 子文件夹"
      const folderPath = path ? `${path} / ${node.title}` : node.title;
      allFolders.push({ id: node.id, title: folderPath });
      // 递归进入子文件夹继续查找
      findFolders(node.children, folderPath, allFolders);
    }
  }
}

/**
 * @description 获取并处理所有的书签文件夹
 */
async function getAllBookmarkFolders() {
  try {
    // 1. 调用 API 获取整个书签树
    const bookmarkTree = await chrome.bookmarks.getTree();
    const allFolders: BookmarkFolder[] = [];
    // 2. 调用辅助函数来处理书签树，提取文件夹
    findFolders(bookmarkTree, '', allFolders);
    // 3. 将结果赋值给响应式变量，触发模板更新
    bookmarkFolders.value = allFolders;
  } catch (e) {
    console.error('获取书签文件夹时出错:', e);
    statusMessage.value = '无法加载书签文件夹。';
  }
}

/**
 * @description 当用户在下拉列表中做出选择时，保存该选择。
 */
function saveSelection() {
  if (selectedFolderId.value) {
    // 使用 chrome.storage.local API 将数据保存到扩展的本地存储中。
    // 这个数据可以在扩展的任何部分（如新标签页）被读取。
    chrome.storage.local.set({ selectedBookmarkFolderId: selectedFolderId.value }, () => {
      statusMessage.value = '设置已保存！';
      // 1.5秒后自动清除状态消息，以改善用户体验
      setTimeout(() => {
        statusMessage.value = '';
      }, 1500);
    });
  }
}

// --- 生命周期钩子 ---
// onMounted 会在组件挂载后执行
onMounted(async () => {
  // 1. 加载所有的书签文件夹以填充下拉列表
  await getAllBookmarkFolders();

  // 2. 尝试从本地存储中获取之前保存过的设置
  const result = await chrome.storage.local.get('selectedBookmarkFolderId');
  if (result.selectedBookmarkFolderId) {
    // 如果找到了，就更新 selectedFolderId 的值，这样下拉列表就会显示之前保存的选项
    selectedFolderId.value = result.selectedBookmarkFolderId;
  }
});
</script>

<style scoped>
main {
  width: 20rem;
  padding: 1em;
  text-align: center;
}

h3 {
  color: #42b983;
  text-transform: uppercase;
  font-size: 1.2rem;
  margin: 1rem auto;
}

p {
  font-size: 0.9rem;
  color: #888;
  margin-bottom: 1.5rem;
}

.setting-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
}

label {
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}

select {
  width: 100%;
  padding: 0.5rem;
  border-radius: 4px;
  border: 1px solid #ccc;
  font-size: 1rem;
}

.status-message {
  margin-top: 1rem;
  color: #42b983;
  font-size: 0.9rem;
}
</style>
