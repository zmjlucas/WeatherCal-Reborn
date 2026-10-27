# 迁移指南 {#migration}

当前引擎接受`layout`字符串中的一棵布局树。
它不接受旧版逐行命令、ASCII布局或设置对象布局。
代码更新会原样保留用户区域中的布局和自定义代码。

## 替换旧布局 {#replace-an-earlier-layout}

1. 保存已安装脚本的副本。
2. 记录希望保留的内容项。
3. 用一个根容器替换旧布局。
4. 将选定内容项放入该容器。
5. 按[快速开始](./quick-start.md)显示小组件。
6. 完成[真机检查](./device-checks.md)。

如果允许引擎调整内容项顺序，请使用`auto`自动布局。
如果必须保留列出的阅读顺序，请使用`flow`保序布局。
需要固定结构时，请使用`row`和`column`。
参见[布局示例](../recipes/layouts.md)。

## 替换旧控制项 {#replace-old-controls}

| 旧控制项 | 当前控制方式 |
| --- | --- |
| `widgetPadding` | 布局字符串中根节点的`padding` |
| 天气水平排列偏好 | `current(variant: "inline")`或`current(variant: "stacked")` |
| 预报水平排列偏好 | 预报内容项的`variant: "horizontal"`或`variant: "vertical"` |
| 自动日出／日落控制项 | 显式添加`sunrise`或`sunset`内容项 |
| 旧太阳事件显示时间窗口 | 显式添加指定太阳事件，不再设置显示时间窗口 |
| `custom.name(column)`回调 | `custom.items`下具有测量能力的模块 |

`widget.padding`仍然控制内置内容项内部的内边距。
这部分内边距计入内容项测量尺寸。

## 保留正确视口 {#keep-the-correct-viewport}

视口偏好留空或设为`auto`时，会启用自动识别。
已有手动值仍然优先。
删除实测覆盖值前，请先阅读[视口](./viewport.md)。

## 替换自定义回调 {#replace-custom-callbacks}

每个自定义模块都必须准备内容、提供测量值，并在分配区域内渲染。
旧回调和缺少测量信息的转换器输出不符合此契约。
请使用完整的[自定义内容项示例](../reference/custom-items.md)。

自定义内容项可选择实现`atFontScale`。
未实现此方法时，它在自动区域中也会保留原始字号。
