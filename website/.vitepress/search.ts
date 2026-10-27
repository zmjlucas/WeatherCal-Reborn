import { tokenize } from './search-tokenizer.mjs';

export const localSearch = {
  provider: 'local',
  options: {
    miniSearch: {
      options: { tokenize },
      searchOptions: { combineWith: 'AND', prefix: true, fuzzy: 0.2 },
    },
    translations: {
      button: { buttonText: 'Search', buttonAriaLabel: 'Search the layout documentation' },
      modal: {
        displayDetails: 'Show result details',
        resetButtonTitle: 'Clear search',
        backButtonTitle: 'Close search',
        noResultsText: 'No results found',
        footer: {
          selectText: 'Select', selectKeyAriaLabel: 'Enter',
          navigateText: 'Navigate', navigateUpKeyAriaLabel: 'Up arrow', navigateDownKeyAriaLabel: 'Down arrow',
          closeText: 'Close', closeKeyAriaLabel: 'Escape',
        },
      },
    },
    locales: {
      zh: {
        translations: {
          button: { buttonText: '搜索', buttonAriaLabel: '搜索布局文档' },
          modal: {
            displayDetails: '显示结果详情',
            resetButtonTitle: '清空搜索',
            backButtonTitle: '关闭搜索',
            noResultsText: '未找到结果',
            footer: {
              selectText: '选择', selectKeyAriaLabel: '回车键',
              navigateText: '切换', navigateUpKeyAriaLabel: '向上箭头', navigateDownKeyAriaLabel: '向下箭头',
              closeText: '关闭', closeKeyAriaLabel: 'Escape键',
            },
          },
        },
      },
    },
  },
} as const;
