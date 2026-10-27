# 术语 {#terminology}

同一概念在本文档中使用同一个技术名词。
代码标识符和界面标签保留源代码中的准确拼写。
中文页面使用相同标识符和示例源文件。

## 布局术语 {#layout-terms}

| 术语 | 含义 |
| --- | --- |
| 布局（layout） | 可编辑`layout`字符串所描述的树。 |
| 节点（node） | 布局树中的一个内容项、容器或留白。 |
| 根节点（root） | 占据视口的唯一最外层节点。 |
| 内容项（item） | 选定的内容模块，例如`current`或`date`。 |
| 内容项实例（item instance） | 内容项在布局中的一次出现。 |
| 容器（container） | 包含子节点的`row`、`column`、`auto`或`flow`节点。 |
| 直接子节点（direct child） | 直接位于某个容器内的节点。 |
| 自动区域（automatic region） | `auto`自动布局或`flow`保序布局容器及其内容。 |
| 手动分组（manual group） | 用`row`和`column`指定的结构。 |
| 主轴（main axis） | 行的水平轴或列的垂直轴。 |
| 交叉轴（cross axis） | 与主轴垂直的轴。 |
| 阅读顺序（reading order） | 从左到右、逐行阅读的顺序。 |

## 尺寸与规划术语 {#size-and-planning-terms}

| 术语 | 含义 |
| --- | --- |
| 尺寸类别（family） | 主屏幕小组件的`small`、`medium`或`large`类别。 |
| 视口（viewport） | 原生内边距设为零时，整个ListWidget的可用区域。 |
| 逻辑点（logical point） | 独立于屏幕像素数量的布局单位。 |
| 屏幕配置（screen profile） | 为已知逻辑屏幕尺寸保存的小组件尺寸。 |
| 覆盖值（override） | 优先于自动识别的显式值。 |
| 内边距（padding） | 节点外部边框以内的留白。 |
| 间距（gap） | 容器直接子节点之间的留白。 |
| 约束（constraint） | 规划器必须满足的要求。 |
| 呈现变体（variant） | 同一已配置内容项的已注册呈现方式。 |
| 预设（preset） | 规划器在进一步搜索前尝试的结构。 |
| 候选（candidate） | 规划器评估的一种可能结构或放置方案。 |
| 布局方案（plan） | 包含内容项位置和尺寸的完整布局树。 |
| 预算（budget） | 候选数或不同测量次数的上限。 |
| 候选前沿（frontier） | 中间阶段保留的候选组合集合。 |
| 字号回退（font fallback） | 后续规划阶段在指定限制内使用较小字号。 |
| 快照（snapshot） | 已准备且在规划期间不会改变的数据和呈现值。 |
| 诊断（diagnostic） | 描述失败或规划情况的代码与消息。 |
| 模拟测量值（synthetic measurement） | 人工设定的受控测试值，不来自原生文本测量。 |
| 结构示意图（schematic diagram） | 说明结构的图，不表示准确的原生位置。 |

## 计算机过程动词 {#computer-process-verbs}

以下技术动词描述本指南中的计算机过程。

| 动词 | 含义 |
| --- | --- |
| parse（解析） | 将布局字符串转换为节点树。 |
| validate（校验） | 将输入与声明的软件契约比较。 |
| render（渲染） | 根据已准备的内容项和放置方案创建原生视图。 |
| register（注册） | 将内容项模块加入可用模块集合。 |
| detect（识别） | 根据设备屏幕尺寸选择已知屏幕配置。 |
| refresh（刷新） | 再次运行小组件以更新显示内容。 |
| request（请求） | 发送获取数据或未来刷新的软件请求。 |

## 写作规则 {#writing-rules}

英文使用主动语态和简短完整句。
指令句不超过20词，说明句不超过25词。
先写条件，再写动作。
每个操作步骤只包含一个动作。
每段不超过六句。
操作步骤使用祈使句。

用“Make sure that”表达需要确认的条件。
用“Do a check”或“Examine”表达检查动作。
不要为了措辞变化而替换同一技术名词。

这些约定支持ASD-STE100原则。
它们不构成完整词典合规认证。
参见[STE官方问答](https://www.asd-ste100.org/STE_faq.html)。
