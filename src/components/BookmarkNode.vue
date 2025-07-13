<template>
  <!-- 
    这是一个递归组件，它根据传入的 `node` 节点的类型来决定如何渲染自己。
    它要么渲染成一个链接（如果 node 是一个书签），要么渲染成一个文件夹（如果 node 是一个文件夹）。
  -->

  <!-- Case 1: 如果节点有 `url` 属性，说明它是一个书签，渲染成一个链接 -->
  <li v-if="node.url">
    <a :href="node.url" target="_blank">{{ node.title }}</a>
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
defineProps<{
  node: chrome.bookmarks.BookmarkTreeNode;
}>();

// 使用 ref 为每个文件夹实例创建一个独立的、响应式的状态，用于控制其是否展开。
// 初始值为 true，表示默认是展开状态。
const isExpanded = ref(true);
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
</style>
