import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: 'Browser Home',
    description: 'A visual home for the places you visit and the workspaces you want to resume.',
    minimum_chrome_version: '116',
    permissions: ['storage', 'tabs', 'tabGroups', 'scripting', 'favicon'],
    host_permissions: ['http://*/*', 'https://*/*'],
    icons: {
      16: 'icon/16.png',
      32: 'icon/32.png',
      48: 'icon/48.png',
      128: 'icon/128.png',
    },
    action: {
      default_title: 'Capture tabs into a workspace',
      default_icon: {
        16: 'icon/16.png',
        32: 'icon/32.png',
      },
    },
  },
});
