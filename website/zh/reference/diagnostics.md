# 诊断代码 {#diagnostics}

布局规划失败时会显示诊断小组件。
引擎不会显示不完整的内容树。
位置信息可用时，诊断包含相关节点、源代码行号和列号。

## 视口与尺寸类别 {#viewport-and-family}

| 代码 | 含义 | 处理方式 |
| --- | --- | --- |
| `VIEWPORT_UNKNOWN` | 当前尺寸类别没有可用视口尺寸 | 按[视口处理流程](../errors/viewport-unknown.md)操作。 |
| `VIEWPORT_INVALID` | 手动尺寸或代码传入尺寸无效 | 提供以逻辑点为单位的有限正数尺寸。 |
| `FAMILY_UNSUPPORTED` | 尺寸类别不受支持，或未提供尺寸类别 | 选择`small`、`medium`或`large`。 |
| `FAMILY_CONFLICT` | 显式指定的尺寸类别与当前小组件不同 | 使用当前小组件的尺寸类别。 |

## 语法与内容项契约 {#syntax-and-item-contracts}

| 代码 | 含义 | 处理方式 |
| --- | --- | --- |
| `SYNTAX_ERROR` | 输入不符合语法 | 检查标点，并确认只有一个根节点。 |
| `LAYOUT_LIMIT_EXCEEDED` | 超过解析器限制 | 减少节点数、嵌套深度或自动区域直接子节点数。 |
| `UNKNOWN_ITEM` | 没有这个名称对应的内容项模块 | 使用已注册的内容项名称。 |
| `UNKNOWN_PROPERTY` | 内容项不接受这个私有选项 | 使用该内容项声明的选项。 |
| `DUPLICATE_PROPERTY` | 同一个参数出现多次 | 每个参数只保留一个值。 |
| `INVALID_PROPERTY` | 属性值或属性组合无效 | 按[属性参考](./syntax.md#properties)修改。 |
| `INVALID_PARAMETER` | 内容项不接受位置字符串参数 | 使用已声明的具名选项。 |
| `INVALID_VARIANT` | 内容项准备阶段找不到指定变体 | 使用已注册的变体名称。 |
| `UNKNOWN_VARIANT` | 纯规划器找不到指定变体 | 提供与布局一致的已准备变体。 |
| `ITEM_CONTRACT_INVALID` | 模块或测量结果违反契约 | 检查[自定义内容项契约](./custom-items.md)。 |

引擎在加载内容前校验内容项名称和私有选项。
未知的容器属性也会产生`INVALID_PROPERTY`。

## 规划失败 {#planning-failures}

| 代码 | 含义 | 处理方式 |
| --- | --- | --- |
| `CONSTRAINT_CONFLICT` | 直接检查的约束不一致 | 使尺寸与视口保持一致。 |
| `NO_CANDIDATE_FITS` | 已评估候选无法容纳全部已选内容 | 按[容纳失败处理流程](../errors/no-candidate-fits.md)操作。 |
| `SEARCH_LIMIT_REACHED` | 找到完整方案前，硬性规划预算已耗尽 | 按[搜索限制处理流程](../errors/search-limit-reached.md)操作。 |

例如，以下根宽度与320逻辑点的视口宽度冲突：

<<< ../../examples/layouts.ts#constraint-conflict

如需创建较小区域，请将固定尺寸节点放在占满视口的根节点内。

## 内部规划器输入 {#internal-planner-inputs}

以下诊断适用于直接调用纯规划器的情况。

| 代码 | 含义 | 处理方式 |
| --- | --- | --- |
| `INVALID_LAYOUT` | 传入的节点树违反规划器契约 | 使用有效的已解析布局树。 |
| `INVALID_LIMITS` | 规划预算不是正整数 | 使用正整数预算。 |

规划预算不是布局属性，也不是用户偏好设置。

## 成功方案的提示 {#successful-plan-messages}

| 代码 | 含义 |
| --- | --- |
| `SEARCH_TRUNCATED` | 引擎限制保留组合或阶段尝试次数后，仍找到了完整方案。 |
| `FONT_ADAPTED` | 完整方案在自动区域中使用了较小字号。 |

这些代码不表示内容被删除。
仅有候选前沿剪枝不会产生`SEARCH_LIMIT_REACHED`。
参见[规划阶段](../explanation/planning.md)。
