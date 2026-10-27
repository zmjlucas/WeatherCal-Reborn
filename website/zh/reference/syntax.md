# 语法与属性 {#syntax-and-properties}

布局必须且只能有一个根节点。
节点可以是内容项、容器或留白。
解析器将布局视为数据。
它不会执行布局字符串中的JavaScript。

## 编写节点 {#write-a-node}

```js
//#region syntax
// Combine text, a fixed row, spaces, and an ordered weather region.
var layout = `
column(gap: 6, padding: [8, 12, 8, 12])[
  text("Good morning"),
  row(gap: 8)[symbol("cloud.rain.fill"), space, battery],
  space(4),
  flow[current, future]
]
`;
//#endregion syntax
```

用逗号分隔参数和子节点。
字符串使用双引号，内部转义采用JSON规则。
参数接受数字、字符串、布尔值和数组字面量。
允许空白、缩进和末尾逗号。
解析器接受`//`注释和不能嵌套的`/* ... */`注释。

`text("Hello")`将字符串映射到`text`选项。
`symbol("cloud.fill")`将字符串映射到`name`选项。
自定义内容项使用具名选项。

## 选择容器 {#containers}

| 节点 | 行为 |
| --- | --- |
| `row[...]` | 沿水平主轴放置直接子节点。 |
| `column[...]` | 沿垂直主轴放置直接子节点。 |
| `auto[...]` | 自动布局：选择直接子节点的分组和顺序。 |
| `flow[...]` | 保序布局：选择分组，同时保持逐行阅读顺序。 |

手动容器可以为空。
自动容器至少需要一个子节点。
参见[布局示例](../recipes/layouts.md)。

## 设置属性 {#properties}

所有尺寸均以逻辑点为单位。
外部尺寸包含节点的布局内边距。

| 属性 | 允许值与含义 | 默认值 |
| --- | --- | --- |
| `width`、`height` | 固定外部尺寸，必须为正数 | 内容需求和父节点分配 |
| `minWidth`、`minHeight` | 非负下限 | 内容需求 |
| `maxWidth`、`maxHeight` | 正数上限 | 无显式上限 |
| `grow` | 手动父节点主轴上剩余空间的非负分配权重 | `auto`、`flow`和弹性`space`为1；其余为0 |
| `gap` | 容器直接子节点之间的非负间距 | 8 |
| `padding` | 非负数或`[top, right, bottom, left]` | 0 |
| `align` | 手动容器交叉轴对齐：`"start"`、`"center"`、`"end"`或`"stretch"` | `"stretch"` |
| `justify` | 手动容器主轴对齐：`"start"`、`"center"`、`"end"`或`"between"` | `"start"` |
| `textAlign` | 可继承的文本对齐：`"start"`、`"center"`或`"end"` | `"start"` |
| `variant` | 内容项模块注册的呈现变体名称 | 由规划器选择 |

只有`textAlign`会从父节点继承。
`gap`适用于容器。
`align`和`justify`只适用于`row`和`column`。
`variant`只适用于内容项。

根内边距由布局字符串指定。
`widget.padding`偏好设置控制内置内容项额外的内部内边距。

## 保持约束一致 {#constraints}

根节点占满整个视口。
显式指定的根宽度或高度必须与对应视口尺寸相等。
如需创建较小的固定区域，请在根节点内放置固定尺寸的子节点。

固定尺寸、最小尺寸和最大尺寸必须相互一致。
子节点不能同时具有正数`grow`和手动父节点主轴上的固定尺寸。
`auto`和`flow`的直接子节点不能指定`grow`。

正数`grow`权重会在满足最低内容需求后分配剩余空间。
权重为1和2，并不保证最终尺寸比例恰好为1:2。

## 添加留白 {#space}

| 节点 | 行为 |
| --- | --- |
| `space(4)` | 沿父节点主轴增加4逻辑点的固定长度。 |
| `space` | 使用权重为1的弹性留白。 |
| `space(grow: 2)` | 使用权重为2的弹性留白。 |

将留白直接放入`row`或`column`。
自动容器直接子节点之间的间距使用`gap`。

## 遵守解析限制 {#parser-limits}

一个布局最多包含128个节点和12层嵌套。
每个自动区域最多包含12个直接子节点。
解析器还将参数数组的嵌套深度限制为12层。

无效语法、属性或名称会产生[诊断信息](./diagnostics.md)。
如果位置信息可用，诊断会包含源代码行号和列号。
