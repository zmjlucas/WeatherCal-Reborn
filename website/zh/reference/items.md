# 内置内容项 {#built-in-items}

名称每出现一次，就会创建一个独立的内容项实例。
成功的布局方案包含所有已选实例，包括空状态和错误状态的呈现。

## 选择内容项 {#select-an-item}

| 名称 | 内容 | 呈现变体 |
| --- | --- | --- |
| `date` | 日期 | `normal` |
| `greeting` | 问候语 | `normal` |
| `battery` | 电池状态 | `normal` |
| `week` | ISO周数 | `normal` |
| `events` | 已配置的日历条目，或空状态说明 | `normal` |
| `reminders` | 已配置的提醒事项，或空状态说明 | `normal` |
| `current` | 已配置的当前天气字段 | `inline`、`stacked` |
| `future` | 按天气偏好显示下一小时或明日天气 | `normal` |
| `forecast`、`daily` | 每日预报；这两个名称互为别名 | `horizontal`、`vertical` |
| `hourly` | 逐小时预报 | `horizontal`、`vertical` |
| `rain` | 带来源链接的和风天气分钟级降雨摘要，或数据不可用提示 | `normal` |
| `sunrise` | 日出；日落后显示明日日出 | `normal` |
| `sunset` | 日落 | `normal` |
| `text("Hello")` | 自定义文本 | `normal` |
| `symbol("cloud.fill")` | SF Symbol符号 | `normal` |

布局选择内容项。
内容项偏好设置决定各项的字段和条目。
`rain`需要受支持的数据源才能显示降雨摘要。
该数据不可用时，它仍会显示。

## 选择呈现变体 {#select-a-variant}

```js
const layout = `column(padding: 12, gap: 8)[
  current(variant: "stacked"),
  daily(variant: "vertical")
]`
```

未指定`variant`时，规划器可以选择已注册的呈现方式。
显式指定的`variant`在所有规划阶段都作为约束保留。
各变体保留已配置字段和字体样式。
白天和夜间的降雨概率仍然分别显示。

自动区域可以在[字体限制](../explanation/planning.md#font-fallback)内缩小字号。
内容项原有的行数限制仍然有效。
测量和渲染使用相同的选定字号。

## 显示数据状态 {#visible-data-states}

没有条目时，日程和提醒事项会显示本地化说明。
如果该说明为空，则显示后备说明。
指定太阳事件的数据不可用时，对应内容项会显示不可用状态。

显式添加的`sunrise`和`sunset`始终选择各自指定的事件。
旧版太阳事件显示时间窗口不再适用。

## 添加自己的内容项 {#add-your-own-item}

在`custom.items`下注册具有测量能力的模块。
完整模块可以替换内置名称。
参见[自定义内容项](./custom-items.md)。
