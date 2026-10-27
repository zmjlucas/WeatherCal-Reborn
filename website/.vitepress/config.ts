import { defineConfig } from 'vitepress';
import { sidebar } from './navigation';
import { localSearch } from './search';

export default defineConfig({
  title: 'WeatherCal Layout',
  description: 'Create layouts for your WeatherCal widget.',
  base: '/WeatherCal-Reborn/',
  srcExclude: ['**/AGENTS.md', '**/agents.md'],
  lang: 'en-US',
  cleanUrls: false,
  locales: {
    root: {
      label: 'English',
      lang: 'en-US',
      description: 'Create layouts for your WeatherCal widget.',
      themeConfig: {
        nav: [
          { text: 'Guide', link: '/guide/quick-start', activeMatch: '/guide/' },
          { text: 'Layouts', link: '/recipes/layouts' },
          { text: 'Reference', link: '/reference/syntax', activeMatch: '/reference/|/errors/' },
          { text: 'About', link: '/about/version', activeMatch: '/about/' },
        ],
        sidebar: sidebar('en'),
        outline: { label: 'On this page', level: [2, 3] },
        docFooter: { prev: 'Previous page', next: 'Next page' },
        langMenuLabel: 'Change language',
        sidebarMenuLabel: 'Menu',
        returnToTopLabel: 'Return to top',
        skipToContentLabel: 'Skip to content',
      },
    },
    zh: {
      label: '简体中文',
      lang: 'zh-CN',
      description: '为 WeatherCal 小组件创建布局。',
      themeConfig: {
        nav: [
          { text: '指南', link: '/zh/guide/quick-start', activeMatch: '/zh/guide/' },
          { text: '布局示例', link: '/zh/recipes/layouts' },
          { text: '参考', link: '/zh/reference/syntax', activeMatch: '/zh/reference/|/zh/errors/' },
          { text: '关于', link: '/zh/about/version', activeMatch: '/zh/about/' },
        ],
        sidebar: sidebar('zh'),
        outline: { label: '本页内容', level: [2, 3] },
        docFooter: { prev: '上一页', next: '下一页' },
        langMenuLabel: '切换语言',
        sidebarMenuLabel: '菜单',
        returnToTopLabel: '返回顶部',
        skipToContentLabel: '跳转到正文',
        darkModeSwitchLabel: '外观',
        lightModeSwitchTitle: '切换到浅色主题',
        darkModeSwitchTitle: '切换到深色主题',
      },
    },
  },
  themeConfig: {
    i18nRouting: true,
    search: localSearch,
  },
});
