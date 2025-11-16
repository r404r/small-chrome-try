<template>
  <!-- 
    这是一个递归组件，它根据传入的 `node` 节点的类型来决定如何渲染自己。
    它要么渲染成一个链接（如果 node 是一个书签），要么渲染成一个文件夹（如果 node 是一个文件夹）。
  -->

  <!-- Case 1: 如果节点有 `url` 属性，说明它是一个书签，渲染成一个链接 -->
  <li 
    v-if="node.url" 
    class="bookmark-item"
    :class="{ 'dragging': isDragging, 'drag-over': isDragOver }"
  >
    <div 
      class="drag-handle" 
      title="拖拽移动书签"
      draggable="true"
      @dragstart="handleDragStart"
      @dragend="handleDragEnd"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
        <path d="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
      </svg>
    </div>
    <a :href="node.url" target="_blank" @click="handleLinkClick">{{ node.title }}</a>
    <button class="edit-btn" @click.stop="editBookmark" title="编辑书签">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
      </svg>
    </button>
    <!-- 拖拽目标区域 -->
    <div 
      class="drop-zone"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      @drop="handleDrop"
    ></div>
  </li>

  <!-- Case 2: 如果节点有 `children` 属性，说明它是一个文件夹 -->
  <li 
    v-else-if="node.children"
    :class="{ 'drag-over': isDragOver }"
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
  >
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
        @moveBookmark="emit('moveBookmark', $event)"
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
  editBookmark: [node: chrome.bookmarks.BookmarkTreeNode];
  moveBookmark: [data: { sourceId: string; targetId: string; position: 'before' | 'after' | 'inside' }];
}>();

// 使用 ref 为每个文件夹实例创建一个独立的、响应式的状态，用于控制其是否展开。
// 初始值为 true，表示默认是展开状态。
const isExpanded = ref(true);

// 拖拽相关状态
const isDragging = ref(false);
const isDragOver = ref(false);

// 编辑书签函数
function editBookmark() {
  emit('editBookmark', props.node);
}

// 拖拽开始
function handleDragStart(event: DragEvent) {
  if (!event.dataTransfer) return;
  
  isDragging.value = true;
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', props.node.id);
  
  // 设置拖拽图像
  if (event.target instanceof HTMLElement) {
    event.dataTransfer.setDragImage(event.target, 0, 0);
  }
}

// 拖拽结束
function handleDragEnd() {
  isDragging.value = false;
}

// 拖拽悬停
function handleDragOver(event: DragEvent) {
  event.preventDefault();
  event.stopPropagation();
  
  if (!event.dataTransfer) return;
  
  const draggedId = event.dataTransfer.getData('text/plain');
  if (draggedId === props.node.id) return; // 不能拖拽到自己
  
  isDragOver.value = true;
  event.dataTransfer.dropEffect = 'move';
}

// 拖拽离开
function handleDragLeave(event: DragEvent) {
  event.stopPropagation();
  
  // 只有当真正离开元素时才取消高亮
  if (event.target === event.currentTarget) {
    isDragOver.value = false;
  }
}

// 放置
function handleDrop(event: DragEvent) {
  event.preventDefault();
  event.stopPropagation();
  
  if (!event.dataTransfer) return;
  
  const draggedId = event.dataTransfer.getData('text/plain');
  if (draggedId === props.node.id) return; // 不能拖拽到自己
  
  isDragOver.value = false;
  
  // 确定放置位置
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  const y = event.clientY - rect.top;
  const height = rect.height;
  
  let position: 'before' | 'after' | 'inside' = 'after';
  
  if (props.node.children) {
    // 如果是文件夹，可以放置到内部
    if (y < height * 0.25) {
      position = 'before';
    } else if (y > height * 0.75) {
      position = 'after';
    } else {
      position = 'inside';
    }
  } else {
    // 如果是书签，只能放置到前面或后面
    position = y < height * 0.5 ? 'before' : 'after';
  }
  
  emit('moveBookmark', {
    sourceId: draggedId,
    targetId: props.node.id,
    position
  });
}

// 处理链接点击（防止拖拽时误触发）
function handleLinkClick(event: MouseEvent) {
  if (isDragging.value) {
    event.preventDefault();
    event.stopPropagation();
  }
}
</script>

<style scoped>
li {
  list-style-type: none;
  text-align: left;
  margin-top: 5px;
}

a {
  font-size: 0.95rem;
  text-decoration: none;
  color: #0f172a;
  display: block;
  padding: 6px 10px;
  border-radius: 8px;
  background-color: #eef2ff;
  border: 1px solid rgba(79, 70, 229, 0.25);
  transition: background-color 0.2s, box-shadow 0.2s;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  word-break: break-all;
}

a:hover {
  background-color: #dfe7ff;
  box-shadow: 0 6px 12px rgba(79, 70, 229, 0.15);
}

.folder {
  cursor: pointer;
  font-weight: 600;
  font-size: 1rem;
  color: #4338ca;
  display: flex;
  align-items: center;
  padding: 4px 6px;
  min-width: 0;
  border-radius: 8px;
  transition: background-color 0.2s;
}

.folder-icon {
  display: inline-block;
  transition: transform 0.2s;
  font-size: 0.8em;
  margin-right: 8px;
  flex-shrink: 0;
  color: #6366f1;
}

.folder-title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  flex: 1;
}

/* 当文件夹展开时，小三角旋转90度 */
.folder-icon.expanded {
  transform: rotate(90deg);
}

/* 子列表的缩进和左侧竖线 */
.sub-list {
  padding-left: 20px;
  border-left: 2px solid rgba(99, 102, 241, 0.2);
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
  background: #6366f1;
  border: none;
  border-radius: 8px;
  padding: 6px;
  cursor: pointer;
  color: #fff;
  opacity: 0.85;
  transition: all 0.25s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 30px;
  height: 30px;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.25);
}

.edit-btn:hover {
  background: #4f46e5;
  transform: translateY(-1px) scale(1.05);
  opacity: 1;
}

.bookmark-item:hover .edit-btn {
  opacity: 1;
}

.edit-btn:active {
  transform: scale(0.98);
}

.edit-btn svg {
  pointer-events: none;
}

/* 拖拽手柄样式 */
.drag-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  cursor: grab;
  color: rgba(15, 23, 42, 0.4);
  transition: all 0.2s ease;
  border-radius: 8px;
  border: 1px solid rgba(99, 102, 241, 0.2);
  background-color: #f8fafc;
}

.drag-handle:hover {
  color: rgba(15, 23, 42, 0.8);
  background-color: rgba(99, 102, 241, 0.12);
}

.drag-handle:active {
  cursor: grabbing;
}

/* 拖拽状态样式 */
.bookmark-item.dragging {
  opacity: 0.6;
  transform: scale(0.98);
  background-color: rgba(99, 102, 241, 0.15);
  border: 2px dashed rgba(99, 102, 241, 0.4);
  border-radius: 10px;
}

/* 拖拽悬停目标样式 */
.bookmark-item.drag-over,
li.drag-over > .folder {
  background-color: rgba(224, 231, 255, 0.9);
  border: 2px solid rgba(99, 102, 241, 0.7);
  border-radius: 10px;
  box-shadow: 0 12px 20px rgba(99, 102, 241, 0.25);
}

.bookmark-item.drag-over a {
  background-color: transparent;
  border-color: transparent;
}

/* 文件夹拖拽悬停样式 */
li.drag-over > .folder {
  color: #0f172a;
}

/* 拖拽时禁用指针事件 */
.bookmark-item.dragging * {
  pointer-events: none;
}
</style>
