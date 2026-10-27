import type { DefaultTheme } from 'vitepress';

const sections = [
  {
    en: 'Start', zh: '开始使用',
    pages: [
      ['', 'Overview', '概览'],
      ['guide/quick-start', 'Quick start', '快速开始'],
      ['guide/viewport', 'Set the viewport', '设置视口'],
      ['guide/migrate', 'Migrate a layout', '迁移布局'],
      ['guide/device-checks', 'Device checks', '设备检查'],
    ],
  },
  {
    en: 'Recipes', zh: '布局示例',
    pages: [['recipes/layouts', 'Compare layouts', '比较布局']],
  },
  {
    en: 'Reference', zh: '参考',
    pages: [
      ['reference/syntax', 'Syntax and properties', '语法与属性'],
      ['reference/items', 'Built-in items', '内置项目'],
      ['reference/custom-items', 'Custom items', '自定义项目'],
      ['reference/diagnostics', 'Diagnostics', '诊断信息'],
    ],
  },
  {
    en: 'Errors', zh: '错误处理',
    pages: [
      ['errors/viewport-unknown', 'VIEWPORT_UNKNOWN', 'VIEWPORT_UNKNOWN'],
      ['errors/no-candidate-fits', 'NO_CANDIDATE_FITS', 'NO_CANDIDATE_FITS'],
      ['errors/search-limit-reached', 'SEARCH_LIMIT_REACHED', 'SEARCH_LIMIT_REACHED'],
    ],
  },
  {
    en: 'Explanation', zh: '工作原理',
    pages: [['explanation/planning', 'How the planner works', '规划器如何工作']],
  },
  {
    en: 'About', zh: '关于',
    pages: [
      ['about/version', 'Version and limits', '版本与限制'],
      ['about/terminology', 'Terminology', '术语'],
    ],
  },
] as const;

export function sidebar(locale: 'en' | 'zh'): DefaultTheme.SidebarItem[] {
  const prefix = locale === 'zh' ? '/zh/' : '/';
  const titleIndex = locale === 'zh' ? 2 : 1;
  return sections.map((section) => ({
    text: section[locale],
    items: section.pages.map((page) => ({ text: page[titleIndex], link: prefix + page[0] })),
  }));
}
