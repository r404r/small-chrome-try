<template>
  <div class="collapsible-section">
    <div class="folder-header" @click="isExpanded = !isExpanded">
      <span :class="{ 'folder-icon': true, 'expanded': isExpanded }">▶</span>
      <span class="folder-title">{{ title }}</span>
    </div>
    <div v-show="isExpanded" class="content">
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

defineProps<{
  title: string;
}>();

// 控制文件夹是否展开的状态，默认为 true (展开)
const isExpanded = ref(true);
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

.content {
  padding-left: 20px;
}
</style>
