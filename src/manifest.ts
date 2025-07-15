// src/manifest.ts
import { defineManifest } from '@crxjs/vite-plugin'
import packageData from '../package.json'

// 【关键改动】将 defineManifest 的参数从一个对象，变成一个返回对象的函数
// 这个函数会接收一个 env 对象，里面包含当前的构建模式 (mode)
export default defineManifest((env) => ({
  name: `${packageData.displayName || packageData.name}${env.mode === 'development' ? ` ➡️ Dev` : ''}`,
  description: packageData.description,
  version: packageData.version,
  manifest_version: 3,

  // 以下内容保持不变，它们的结构是正确的
  icons: {
    '16': 'img/logo-16.png',
    '32': 'img/logo-32.png',
    '48': 'img/logo-48.png',
    '128': 'img/logo-128.png',
  },
  action: {
    default_popup: 'popup.html',
    default_icon: {
      '16': 'img/logo-16.png',
      '32': 'img/logo-32.png',
      '48': 'img/logo-48.png',
    },
  },
  options_page: 'options.html',
  devtools_page: 'devtools.html',
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: ['http://*/*', 'https://*/*'],
      js: ['src/contentScript/index.ts'],
    },
  ],
  side_panel: {
    default_path: 'sidepanel.html',
  },
  web_accessible_resources: [
    {
      resources: ['img/logo-16.png', 'img/logo-32.png', 'img/logo-48.png', 'img/logo-128.png'],
      matches: ['<all_urls>'], // 建议添加，否则 content script 无法访问这些资源
    },
  ],
  permissions: ['storage', 'sidePanel', 'topSites', 'bookmarks', 'history'],
  chrome_url_overrides: {
    newtab: 'newtab.html', // Vite 构建后会生成 index.html
  },
}))
