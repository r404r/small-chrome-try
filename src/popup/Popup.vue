<template>
  <main>
    <h3>选择书签文件夹</h3>
    <p>请选择一个你想在新标签页中展示的书签文件夹。</p>
    <div class="setting-item">
      <label for="bookmark-folder-select">书签文件夹:</label>
      <select id="bookmark-folder-select" v-model="selectedFolderId" @change="saveSelection">
        <option disabled value="">请选择...</option>
        <option v-for="folder in bookmarkFolders" :key="folder.id" :value="folder.id">
          {{ folder.title }}
        </option>
      </select>
    </div>
    <div v-if="statusMessage" class="status-message">{{ statusMessage }}</div>
  </main>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

interface BookmarkFolder {
  id: string;
  title: string;
}

const bookmarkFolders = ref<BookmarkFolder[]>([]);
const selectedFolderId = ref<string>('');
const statusMessage = ref('');

// 递归地从书签树中提取所有文件夹
function findFolders(nodes: chrome.bookmarks.BookmarkTreeNode[], path: string, allFolders: BookmarkFolder[]) {
  for (const node of nodes) {
    if (node.children) { // 这是一个文件夹
      const folderPath = path ? `${path} / ${node.title}` : node.title;
      allFolders.push({ id: node.id, title: folderPath });
      // 递归查找子文件夹
      findFolders(node.children, folderPath, allFolders);
    }
  }
}

// 获取所有书签文件夹
async function getAllBookmarkFolders() {
  try {
    const bookmarkTree = await chrome.bookmarks.getTree();
    const allFolders: BookmarkFolder[] = [];
    findFolders(bookmarkTree, '', allFolders);
    bookmarkFolders.value = allFolders;
  } catch (e) {
    console.error('获取书签文件夹时出错:', e);
    statusMessage.value = '无法加载书签文件夹。';
  }
}

// 保存用户的选择
function saveSelection() {
  if (selectedFolderId.value) {
    chrome.storage.local.set({ selectedBookmarkFolderId: selectedFolderId.value }, () => {
      statusMessage.value = '设置已保存！';
      // 1.5秒后清除状态消息
      setTimeout(() => {
        statusMessage.value = '';
      }, 1500);
    });
  }
}

// 在组件挂载时加载数据
onMounted(async () => {
  await getAllBookmarkFolders();

  // 获取已保存的设置
  const result = await chrome.storage.local.get('selectedBookmarkFolderId');
  if (result.selectedBookmarkFolderId) {
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
