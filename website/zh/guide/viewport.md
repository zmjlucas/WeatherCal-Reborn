# 视口 {#viewport}

视口是整个ListWidget可用区域的宽度和高度，单位为逻辑点。
原生小组件内边距设为零。
引擎在这个区域内应用布局内边距。
屏幕像素尺寸和全屏尺寸都不是小组件视口尺寸。

## 使用自动识别 {#use-automatic-detection}

将对应尺寸类别的视口覆盖项留空，或输入`auto`。
引擎会忽略`auto`的大小写和前后空格。

引擎读取`Device.screenSize()`，再将逻辑尺寸与已知屏幕配置进行比较。
横屏和竖屏的屏幕尺寸会匹配到同一配置。
引擎从该配置中选择当前小组件尺寸类别对应的尺寸。

屏幕配置提供标准主屏幕图标模式下的参考估计值。
iPad配置采用Canvas尺寸。
Scriptable不提供实际小组件边界或大图标设置的读取接口。
显示缩放、大图标和操作系统变化可能使手动覆盖成为必要。
未知屏幕尺寸会产生`VIEWPORT_UNKNOWN`。

## 设置手动覆盖值 {#set-a-manual-override}

如果自动识别尺寸与设备实测尺寸不一致，请使用手动覆盖值。

1. 打开**Widget Setup**。
2. 选择**Edit preferences**。
3. 选择**Overall settings**。
4. 选择当前小组件尺寸类别对应的覆盖项。
5. 按`width x height`格式输入实测宽度和高度。
6. 保存偏好设置。
7. 完成[真机检查](./device-checks.md)。

| 尺寸类别 | 设置项名称 | 设置键 |
| --- | --- | --- |
| `small` | Small viewport override | `widget.smallViewport` |
| `medium` | Medium viewport override | `widget.mediumViewport` |
| `large` | Large viewport override | `widget.largeViewport` |

例如，`320 x 160`表示宽320逻辑点、高160逻辑点。
这组示例尺寸不是设备实测配置。
宽度和高度都必须是有限正数。
无效的手动尺寸会产生`VIEWPORT_INVALID`。

## 了解优先级 {#understand-priority}

引擎按以下顺序使用第一个可用来源：

1. 代码传入的`options.viewport`。
2. 当前尺寸类别的手动偏好值。
3. 自动识别。

手动覆盖和代码覆盖都不需要访问屏幕API。
如需重新使用自动识别，请清空手动偏好值或输入`auto`。

## 在代码中提供尺寸 {#supply-dimensions-in-code}

```js
const widget = await code.createWidget(layout, name, iCloudInUse, custom, {
  family: "medium",
  viewport: { width: 320, height: 160 }
})
```

该示例使用实验尺寸。
已安装脚本的入口会先选择预览尺寸类别，再规划布局。
主屏幕运行使用`config.widgetFamily`。
显式指定的尺寸类别必须与当前小组件一致。
本版本不支持超大尺寸和配件类小组件。
