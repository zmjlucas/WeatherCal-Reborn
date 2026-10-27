# VIEWPORT_UNKNOWN {#viewport-unknown}

引擎没有当前尺寸类别可用的视口尺寸。
自动识别无法匹配屏幕配置，或无法读取屏幕尺寸。
并非每位用户都需要手动设置视口。

## 确认原因 {#identify-the-cause}

阅读诊断消息。
消息会指出是屏幕尺寸未知，还是屏幕API不可用。

视口偏好留空或设为`auto`会启用自动识别。
已知屏幕配置通常可以提供尺寸。
引擎不会猜测未知屏幕的尺寸。

## 提供实测覆盖值 {#supply-a-measured-override}

1. 为当前设备配置[获取可用的小组件尺寸](../guide/viewport.md#obtain-usable-dimensions)。
2. 用逻辑点记录两个尺寸。
3. 打开**Widget Setup**。
4. 选择**Edit preferences**。
5. 选择**Overall settings**。
6. 选择当前尺寸类别对应的视口覆盖项。
7. 按`width x height`格式输入实测尺寸。
8. 再次运行预览。
9. 完成[真机检查](../guide/device-checks.md)。

不要将屏幕像素尺寸或全屏尺寸当作小组件尺寸。
示例`320 x 160`不是设备实测配置。

## 代码调用方式 {#programmatic-callers}

通过`options.viewport`提供有限正数`width`和`height`。
这个覆盖值不需要访问屏幕API。
参见[代码示例](../guide/viewport.md#supply-dimensions-in-code)。

如果代码变为`VIEWPORT_INVALID`，请修正尺寸格式或数值。
如果出现容纳失败诊断，请查阅[诊断参考](../reference/diagnostics.md)。
