<template>
  <!-- 
    这是一个递归组件，它根据传入的 `node` 节点的类型来决定如何渲染自己。
    它要么渲染成一个链接（如果 node 是一个书签），要么渲染成一个文件夹（如果 node 是一个文件夹）。
  -->

  <!-- Case 1: 如果节点有 `url` 属性，说明它是一个书签，渲染成一个链接 -->
  <li v-if="node.url" class="bookmark-item">
    <a :href="node.url" target="_blank">{{ node.title }}</a>
    <button class="edit-btn" @click.stop="editBookmark" title="编辑书签">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
      </svg>
    </button>
  </li>

  <!-- Case 2: 如果节点有 `children` 属性，说明它是一个文件夹 -->
  <li v-else-if="node.children">
    <!-- 文件夹标题行，点击时切换展开/折叠状态 -->
    <div class="folder" @click="isExpanded = !isExpanded">
      <!-- 
        小三角图标，它的 `expanded` class 根据 isExpanded 的值动态添加或移除，
        从而通过 CSS 实现旋转动画。
      -->
      <span :class="{ 'folder-icon': true, 'expanded': isExpanded }">▶</span>
      <span class="folder-title">{{ node.title }}</span>
    </div>
    <!-- 
      文件夹的内容列表，使用 v-show 来控制显示和隐藏。
      v-show 的性能比 v-if 好，因为它只是切换 CSS 的 display 属性，而不是真正地创建和销毁 DOM 元素。
    -->
    <ul v-show="isExpanded" class="sub-list">
      <!-- 
        【核心递归】
        这里是实现递归的关键：组件在自己的模板中再次调用了自己。
        我们遍历当前文件夹节点(node)的所有子节点(child)，
        并为每一个子节点创建一个新的 <BookmarkNode> 实例，
        将子节点 `child` 作为新的 `node` prop 传递下去。
        这个过程会一直持续，直到所有的书签和文件夹都被渲染出来。
      -->
      <BookmarkNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        @editBookmark="emit('editBookmark', $event)"
      />
    </ul>
  </li>
</template>

<script setup lang="ts">
import { ref } from 'vue';

// defineOptions 是一个编译器宏，用于在 <script setup> 中声明组件选项。
// 对于递归组件，必须给它一个明确的 `name`，这样它才能在模板中通过这个名字引用自己。
defineOptions({
  name: 'BookmarkNode'
})

// defineProps 用于声明组件的 props。
// 这里我们声明了一个名为 `node` 的 prop，它的类型是 chrome.bookmarks.BookmarkTreeNode。
// 这个 prop 从父组件（NewTab.vue 或上一层的 BookmarkNode）接收一个书签或文件夹节点。
const props = defineProps<{
  node: chrome.bookmarks.BookmarkTreeNode;
}>();

// 定义事件
const emit = defineEmits<{
  editBookmark: [node: chrome.bookmarks.BookmarkTreeNode]
}>();

// 使用 ref 为每个文件夹实例创建一个独立的、响应式的状态，用于控制其是否展开。
// 初始值为 true，表示默认是展开状态。
const isExpanded = ref(true);

// 编辑书签函数
function editBookmark() {
  emit('editBookmark', props.node);
}
</script>

<style scoped>
li {
  list-style-type: none;
  text-align: left;
  margin-top: 5px;
}

a {
  font-size: 1rem;
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
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.7);
}

.folder-icon {
  display: inline-block;
  transition: transform 0.2s;
  font-size: 0.8em;
  margin-right: 8px;
}

/* 当文件夹展开时，小三角旋转90度 */
.folder-icon.expanded {
  transform: rotate(90deg);
}

/* 子列表的缩进和左侧竖线 */
.sub-list {
  padding-left: 20px;
  border-left: 1px solid #777;
  margin-left: 5px;
}

/* 书签项样式 */
.bookmark-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
}

.bookmark-item a {
  flex: 1;
  margin: 0;
}

/* 编辑按钮样式 */
.edit-btn {
  background: rgba(66, 185, 131, 0.8);
  border: 1px solid rgba(66, 185, 131, 0.9);
  border-radius: 6px;
  padding: 6px;
  cursor: pointer;
  color: #fff;
  opacity: 0.7;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 28px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.edit-btn:hover {
  background: rgba(66, 185, 131, 1);
  border-color: rgba(66, 185, 131, 1);
  transform: scale(1.15);
  opacity: 1;
  box-shadow: 0 4px 8px rgba(66, 185, 131, 0.4);
}

.bookmark-item:hover .edit-btn {
  opacity: 1;
}

.edit-btn:active {
  transform: scale(1.05);
  box-shadow: 0 2px 4px rgba(66, 185, 131, 0.6);
}

.edit-btn svg {
  pointer-events: none;
}
</style>
