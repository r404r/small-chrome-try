<template>
  <li v-if="node.url">
    <a :href="node.url" target="_blank">{{ node.title }}</a>
  </li>
  <li v-else-if="node.children">
    <div class="folder" @click="isExpanded = !isExpanded">
      <span :class="{ 'folder-icon': true, 'expanded': isExpanded }">▶</span>
      <span class="folder-title">{{ node.title }}</span>
    </div>
    <ul v-show="isExpanded" class="sub-list">
      <BookmarkNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
      />
    </ul>
  </li>
</template>

<script setup lang="ts">
import { ref } from 'vue';

// 递归组件需要一个明确的名字，用于模板中的自我引用
defineOptions({
  name: 'BookmarkNode'
})

// 定义 props，接收一个书签节点
// 'BookmarkTreeNode' 类型是全局的，无需导入
defineProps<{
  node: chrome.bookmarks.BookmarkTreeNode;
}>();

// 控制文件夹是否展开的状态，默认为 true (展开)
const isExpanded = ref(true);
</script>

<style scoped>
li {
  list-style-type: none;
  text-align: left;
  margin-top: 5px;
}

a {
  font-size: 1rem; /* 调整字体大小以便阅读 */
  text-decoration: none;
  color: #fff;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
  display: block;
  padding: 5px 8px;
  border-radius: 4px;
  background-color: rgba(0, 0, 0, 0.4);
  transition: background-color 0.2s;
}

a:hover {
  background-color: rgba(0, 0, 0, 0.6);
}

.folder {
  cursor: pointer;
  font-weight: bold;
  font-size: 1.1rem;
  color: #42b983; /* 使用主题绿色以突出显示 */
  display: flex;
  align-items: center;
  padding: 4px;
  /* 增强文本阴影以提高可读性 */
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.7);
}

.folder-icon {
  display: inline-block;
  transition: transform 0.2s;
  font-size: 0.8em;
  margin-right: 8px;
}

.folder-icon.expanded {
  transform: rotate(90deg);
}

.sub-list {
  padding-left: 20px;
  border-left: 1px solid #777;
  margin-left: 5px;
}
</style>
