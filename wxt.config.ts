import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-vue'],
  manifest: {
    name: 'DragonFill - 龙息填充',
    description: '全局级 AI 智能表单填充引擎 | Bio-Digital Fusion Form Autofill',
    permissions: [
      'activeTab',
      'storage',
      'clipboardRead',
      'scripting'
    ],
    host_permissions: [
      '<all_urls>'
    ],
    action: {
      default_title: 'DragonFill',
      default_icon: {
        16: '/icon/16.svg',
        32: '/icon/32.svg',
        48: '/icon/48.svg',
        128: '/icon/128.svg'
      }
    },
    icons: {
      16: '/icon/16.svg',
      32: '/icon/32.svg',
      48: '/icon/48.svg',
      128: '/icon/128.svg'
    }
  }
});
