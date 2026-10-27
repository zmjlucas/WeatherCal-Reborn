# 布局指南 {#layout-guide}

用一个`layout`字符串选择小组件内容及其结构。
布局引擎先准备内容、规划位置，再创建Scriptable原生视图。
成功的布局方案包含每个已选内容项实例。

## 从这里开始 {#start-here}

1. [创建第一个布局](./guide/quick-start.md)。
2. [比较布局模式](./recipes/layouts.md)。
3. [完成真机检查](./guide/device-checks.md)。

如果你仍在使用旧布局格式，请先阅读[迁移指南](./guide/migrate.md)。

## 选择布局模式 {#choose-a-layout-mode}

| 模式 | 用途 |
| --- | --- |
| `auto`自动布局 | 允许引擎调整内容项顺序和分组。 |
| `flow`保序布局 | 允许引擎调整分组，同时保留列出的阅读顺序。 |
| `row`和`column` | 保持指定结构。 |
| 包含`auto`或`flow`的手动容器 | 固定一部分结构，允许另一部分结构变化。 |

视口偏好留空或设为`auto`时，引擎会根据已知屏幕配置自动识别视口。
手动视口覆盖值仍然有效。
参见[视口](./guide/viewport.md)。

## 查阅参考 {#find-a-reference}

- [语法与属性](./reference/syntax.md)
- [内置内容项](./reference/items.md)
- [自定义内容项](./reference/custom-items.md)
- [诊断代码](./reference/diagnostics.md)
- [规划阶段](./explanation/planning.md)

## 了解限制 {#know-the-limits}

引擎支持`small`、`medium`和`large`主屏幕小组件。
自动区域会尝试预设、进一步搜索，以及有下限的字体缩小。
引擎不会为了容纳内容而删除已选内容。

本文档对应的实现基线见[版本与验证](./about/version.md)。
结构图只是示意图。
它们不是Scriptable原生预览。
