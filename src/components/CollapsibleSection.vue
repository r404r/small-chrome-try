<template>
  <div class="collapsible-section">
    <!-- 可点击的头部，用于切换内容的展开/折叠状态 -->
    <div class="folder-header" @click="isExpanded = !isExpanded">
      <span :class="{ 'folder-icon': true, 'expanded': isExpanded }">▶</span>
      <!-- 标题由父组件通过 prop 传入 -->
      <span class="folder-title">{{ title }}</span>
    </div>
    <!-- 
      v-show 指令用于根据 isExpanded 的值来显示或隐藏这部分内容。
      这部分是这个组件的核心可复用性的体现。
    -->
    <div v-show="isExpanded" class="content">
      <!-- 
        【核心：插槽 <slot>】
        <slot> 是 Vue 的一个内置组件，它是一个占位符。
        当父组件使用这个 CollapsibleSection 组件时，
        可以像使用普通 HTML 标签一样，在它的开始和结束标签之间放入任何内容。
        这些内容最终会被渲染到 <slot> 所在的位置。
        这使得我们的折叠组件变得非常通用，它可以包裹任何类型的内容（列表、文本、其他组件等）。
        例如，在 NewTab.vue 中，我们就是把“常用网站”的 <div> 列表放在了这里的 <slot> 位置。
      -->
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';

// 使用 defineProps 定义组件的 props
const props = defineProps<{
  title: string;
  storageKey?: string; // 可选的存储键，用于持久化状态
}>();

// 为每个组件实例创建一个独立的、响应式的状态，用于控制其是否展开。
const isExpanded = ref(true);

// 组件挂载时从本地存储加载状态
onMounted(async () => {
  if (props.storageKey) {
    try {
      const result = await chrome.storage.local.get(props.storageKey);
      if (result[props.storageKey] !== undefined) {
        isExpanded.value = result[props.storageKey];
      }
    } catch (error) {
      console.warn('Failed to load collapse state:', error);
    }
  }
});

// 监听状态变化并保存到本地存储
watch(isExpanded, async (newValue) => {
  if (props.storageKey) {
    try {
      await chrome.storage.local.set({ [props.storageKey]: newValue });
    } catch (error) {
      console.warn('Failed to save collapse state:', error);
    }
  }
});
</script>

<style scoped>
.folder-header {
  cursor: pointer;
  font-weight: bold;
  font-size: 1.1rem;
  color: #42b983; /* 使用主题绿色以突出显示 */
  display: flex;
  align-items: center;
  padding: 4px;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.7);
  margin-bottom: 8px;
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

/* 折叠内容区域的左内边距，使其与标题下的内容对齐 */
.content {
  padding-left: 20px;
}
</style>
