# 布局示例 {#layout-examples}

以下各布局模式都使用`current`、`rain`和`future`。
组合示例还会在自动区域外放置`date`。

每个代码块都来自共享示例源文件。
选择一个示例，替换`WeatherCal-Reborn.js`中现有的`var layout`定义。

## 允许调整顺序 {#auto}

如果允许引擎调整直接子节点的顺序，请使用`auto`自动布局。

<<< ../../examples/layouts.js#auto

引擎根据内容测量结果选择行、列、网格、横向通栏或侧边分组。

## 保持阅读顺序 {#flow}

如果必须保留列出的阅读顺序，请使用`flow`保序布局。

<<< ../../examples/layouts.js#flow

按从左到右、逐行的方式阅读结果。
直接子节点在这个阅读序列中保留原有顺序。
不同结构下，它们的位置可以变化。

## 保持结构 {#manual}

使用`row`和`column`保持指定分组。

<<< ../../examples/layouts.js#manual

该布局将`current`、`rain`和`future`保持在同一水平行中。
引擎不会缩小这个手动布局的字号。
内容需要的空间超出视口时，这个布局可能无法生成方案。

## 组合固定区域与自动区域 {#semi-auto}

在手动容器中放入自动区域。

<<< ../../examples/layouts.js#semi-auto

`date`始终位于自动区域上方，字号保持不变。
自动区域可以调整天气内容项的顺序和分组。

`auto`或`flow`中的手动分组会保持完整。
引擎不能将内容项移出该分组。

## 比较结构 {#compare-the-structures}

![自动布局、保序布局、手动布局和组合布局的结构示意图。](/diagrams/layout-modes.svg)

该图仅说明结构选择。
实际位置取决于视口、字体、语言和数据。
它不是Scriptable原生预览。

示例测试使用320 × 160逻辑点的视口和人工设定的内容项测量值。
示例测试通过，不代表该布局能容纳手机上的实际内容或真实预报数据。
正式使用布局前，请完成[真机检查](../guide/device-checks.md)。

## 容纳失败后调整布局 {#adjust-a-layout-that-does-not-fit}

根据诊断代码选择下一步操作：

- [VIEWPORT_UNKNOWN](../errors/viewport-unknown.md)：自动识别无法选择屏幕配置时，提供实测边界。
- [NO_CANDIDATE_FITS](../errors/no-candidate-fits.md)：减少内容所需空间，或移除过于严格的尺寸限制。
- [SEARCH_LIMIT_REACHED](../errors/search-limit-reached.md)：减少搜索组合，或指定更多结构。
