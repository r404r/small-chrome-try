<template>
  <!-- 模态框遮罩层 -->
  <div v-if="isVisible" class="modal-overlay" @click="closeModal">
    <!-- 模态框内容 -->
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>编辑书签</h3>
        <button class="close-btn" @click="closeModal" title="关闭">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>
      
      <div class="modal-body">
        <form @submit.prevent="saveBookmark">
          <div class="form-group">
            <label for="bookmark-title">标题:</label>
            <input
              id="bookmark-title"
              v-model="editForm.title"
              type="text"
              class="form-input"
              placeholder="请输入书签标题"
              required
            />
          </div>
          
          <div class="form-group">
            <label for="bookmark-url">网址:</label>
            <input
              id="bookmark-url"
              v-model="editForm.url"
              type="url"
              class="form-input"
              placeholder="请输入书签网址"
              required
            />
          </div>
          
          <div class="form-actions">
            <button type="button" class="btn btn-delete" @click="showDeleteConfirm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
              </svg>
              删除
            </button>
            <div class="action-group">
              <button type="button" class="btn btn-cancel" @click="closeModal">
                取消
              </button>
              <button type="submit" class="btn btn-save" :disabled="!isFormValid">
                保存
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';

// 定义 props
const props = defineProps<{
  isVisible: boolean;
  bookmark: chrome.bookmarks.BookmarkTreeNode | null;
}>();

// 定义事件
const emit = defineEmits<{
  close: [];
  save: [bookmark: { id: string; title: string; url: string }];
  delete: [bookmarkId: string];
}>();

// 编辑表单数据
const editForm = ref({
  title: '',
  url: ''
});

// 删除确认状态
const showDeleteConfirmDialog = ref(false);

// 表单验证
const isFormValid = computed(() => {
  return editForm.value.title.trim() !== '' && editForm.value.url.trim() !== '';
});

// 监听书签变化，更新表单数据
watch(() => props.bookmark, (newBookmark) => {
  if (newBookmark) {
    editForm.value.title = newBookmark.title || '';
    editForm.value.url = newBookmark.url || '';
  }
}, { immediate: true });

// 关闭模态框
function closeModal() {
  emit('close');
}

// 保存书签
function saveBookmark() {
  if (!props.bookmark || !isFormValid.value) return;
  
  emit('save', {
    id: props.bookmark.id,
    title: editForm.value.title.trim(),
    url: editForm.value.url.trim()
  });
}

// 显示删除确认
function showDeleteConfirm() {
  if (!props.bookmark) return;
  
  const confirmed = confirm(`确定要删除书签 "${props.bookmark.title}" 吗？此操作无法撤销。`);
  if (confirmed) {
    emit('delete', props.bookmark.id);
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@100;300;400;500;700;900&display=swap');

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal-content {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.3);
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow: hidden;
  color: #333;
  font-family: 'Noto Sans SC', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  background: rgba(255, 255, 255, 0.1);
}

.modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  color: #666;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: rgba(0, 0, 0, 0.1);
  color: #333;
}

.modal-body {
  padding: 1.5rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #333;
}

.form-input {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-radius: 6px;
  font-size: 1rem;
  background: rgba(255, 255, 255, 0.8);
  transition: all 0.2s ease;
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: #42b983;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 0 0 3px rgba(66, 185, 131, 0.1);
}

.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: space-between;
  align-items: center;
  margin-top: 2rem;
}

.action-group {
  display: flex;
  gap: 1rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 80px;
}

.btn-cancel {
  background: rgba(0, 0, 0, 0.1);
  color: #666;
}

.btn-cancel:hover {
  background: rgba(0, 0, 0, 0.2);
  color: #333;
}

.btn-save {
  background: #42b983;
  color: white;
}

.btn-save:hover:not(:disabled) {
  background: #369870;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(66, 185, 131, 0.3);
}

.btn-save:disabled {
  background: #ccc;
  cursor: not-allowed;
  opacity: 0.6;
}

.btn-delete {
  background: #e74c3c;
  color: white;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-delete:hover {
  background: #c0392b;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(231, 76, 60, 0.3);
}

.btn-delete svg {
  pointer-events: none;
}
</style>
