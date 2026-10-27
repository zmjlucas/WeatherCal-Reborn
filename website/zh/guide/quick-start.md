# 快速开始 {#quick-start}

本流程需要先安装使用当前布局引擎的WeatherCal-Reborn脚本。
如果仍在使用旧格式，请先完成[迁移](./migrate.md)。

## 设置布局 {#set-the-layout}

1. 在Scriptable中打开已安装的`one.js`脚本。
2. 找到`WeatherCal: user begin`标记。
3. 找到用户区域内的`layout`值。
4. 用下方示例的字符串内容替换反引号之间的文本。
5. 保存脚本。

<<< ../../examples/layouts.ts#auto

`autoLayout`是文档示例的名称。
已安装脚本使用的名称是`layout`。
只复制反引号之间的文本。

这个示例选择`current`、`rain`和`future`。
当降雨数据不可用时，`rain`会显示数据可用性说明。
参见[内置内容项](../reference/items.md)。

## 显示小组件 {#show-the-widget}

1. 在Scriptable中运行脚本。
2. 如果打开了初始设置，完成该流程。
3. 再次运行脚本。
4. 在**Widget Setup**中选择**Edit preferences**。
5. 选择**Overall settings**。
6. 将**Widget preview size**设为`small`、`medium`或`large`。
7. 将对应的视口覆盖项留空，以使用自动识别。
8. 再次运行脚本。
9. 选择**Show widget preview**。

已有手动视口值的优先级高于自动识别。
如需重新使用自动识别，请清空该值或输入`auto`。
参见[视口](./viewport.md)。

## 检查结果 {#do-a-check}

确认每个已选内容项实例都出现一次。
重复的内容项名称会创建独立实例。
然后在主屏幕完成[真机检查](./device-checks.md)。

如果出现诊断信息，请按代码查阅[诊断参考](../reference/diagnostics.md)。
如果自动识别失败，请按[VIEWPORT_UNKNOWN](../errors/viewport-unknown.md)处理。
