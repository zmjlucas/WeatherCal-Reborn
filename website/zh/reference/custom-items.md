# 自定义内容项 {#custom-items}

将每个自定义模块注册在`custom.items`下。
模块会为布局中每个已选实例准备一次内容。
它返回同步的测量函数和渲染函数。

完整模块可以替换内置内容项名称。
`row`、`column`、`auto`、`flow`和`space`是保留名称。

## 使用完整示例 {#complete-example}

该示例渲染一行不换行文本。
准备阶段会保存文本、字体、颜色和保守的宽度估计值。
示例不测量原生文本。

<<< ../../examples/custom-item.js#custom-item

用此示例替换用户区域中现有的`var custom`和`var layout`定义。

这个内容项没有实现`atFontScale`，因此在自动区域中也会保留原始字号。
请使用实际文本和字体完成[真机检查](../guide/device-checks.md)。

## 准备快照 {#prepare}

`prepare({ host, get }, options)`可以加载数据，并创建可复用的图像、字体和颜色。
它不能创建原生布局视图。
请保存测量和渲染需要的全部值。
之后的数据或偏好变化不能改变已准备的快照。

私有选项类型声明为`"string"`、`"number"`或`"boolean"`。
自定义内容项使用具名选项。
只有已注册的`text`和`symbol`映射接受位置字符串参数。

用`get(key, asyncLoader)`在一次小组件创建过程中共享资源Promise。
它会保存该键对应的待完成、成功和失败Promise。

## 返回内容项契约 {#item-contract}

| 成员 | 要求 |
| --- | --- |
| `state` | `"ready"`、`"empty"`或`"error"` |
| `effects` | 一个对象，可包含`refreshAfterDate` |
| `variants` | 至少一个有效呈现变体 |
| `render(container, placement)` | 在分配的内容区域内同步渲染 |
| `atFontScale(scale)` | 可选的纯字体适配方法 |

为空状态和错误状态提供可见内容。
仅设置状态值不会自动创建说明文本。

每个变体都要有唯一且非空的`id`，以及同步的`measure(width)`函数。
`minWidth`必须是有限非负数。
`preferredWidth`必须是有限数，且不小于`minWidth`。
可选的`maxWidth`必须是有限数，且不小于`preferredWidth`。
`adaptationCost`必须是有限非负数。

## 测量与渲染 {#measure-and-render}

测量函数接收扣除布局内边距后的内容宽度。
返回有限、非负的`requiredHeight`和`preferredHeight`。
`preferredHeight`必须不小于`requiredHeight`。
内容必须具有正高度才能放置。
根据测量依据，将`confidence`设为`"estimated"`或`"calibrated"`。

对于相同快照和宽度，`measure`必须返回相同结果。
它不能请求数据或创建原生视图。

`placement`包含`id`、`variant`、`width`、`height`和`textAlign`。
在分配的内容区域内渲染选定变体。
渲染期间不能获取数据，也不能选择其他变体。

## 支持字体适配 {#font-adaptation}

`atFontScale(scale)`返回同一内容的新`PreparedItem`快照。
保持原始快照不变。
保持变体ID不变。
缩放后的测量和渲染必须一致。
适配期间不能请求数据或创建原生视图。

原始字号至少为10pt时，适配后的字号不能低于10pt。
原始字号小于10pt时，保持原始字号。
渲染器使用规划器选定的快照。
内置内容项自动实现字体适配。

## 请求刷新与设置背景 {#effects-and-background}

将`effects.refreshAfterDate`设为有效`Date`以请求刷新。
渲染器取最早的刷新请求，同时考虑配置的小组件刷新间隔。
默认间隔为15分钟。
iOS可能晚于请求时间刷新。

`custom.background(widget)`回调可以设置背景样式。
它不能添加子视图。
旧式`custom.name(column)`回调不符合具有测量能力的内容项契约。
