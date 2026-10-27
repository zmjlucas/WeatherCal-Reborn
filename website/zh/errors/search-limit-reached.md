# SEARCH_LIMIT_REACHED {#search-limit-reached}

引擎尚未找到完整布局方案，就已达到候选数或测量次数上限。
其他排列仍有可能容纳全部内容。
引擎不会返回不完整的内容树。

## 减少搜索组合 {#reduce-the-search-problem}

1. 将相关内容项放入手动`row`或`column`分组。
2. 如果必须保留列出顺序，使用`flow`保序布局。
3. 移除不需要的已选内容项。
4. 如果合适，移除过于严格的尺寸限制。
5. 再次运行预览。

自动区域中的一个手动分组仍视为一个直接子节点。
这样可以减少分组和顺序的选择数量。
同时，该分组的内部结构也会固定。
参见[布局示例](../recipes/layouts.md)。

## 了解限制 {#understand-the-limits}

默认情况下，引擎为每个自动区域最多评估256个结构候选。
每个布局方案最多进行4,096次不同测量。
每个中间候选前沿最多保留24种组合。
这些是引擎限制，不是Scriptable平台限制。

仅有候选前沿剪枝不会导致`SEARCH_LIMIT_REACHED`。
有限剪枝后得到的完整方案可能包含`SEARCH_TRUNCATED`。
参见[规划限制](../explanation/planning.md#limits)。

## 在规划器测试中复现诊断 {#planner-test}

<<< ../../examples/layouts.ts#search-limit

共享测试使用内部规划器覆盖值`maxMeasurements: 1`运行此布局。
这个预算只允许测量一次，但这三个内容项需要更多次测量才能得到完整方案。
`maxMeasurements`不是布局属性，也不是用户偏好设置。
不要将它写入已安装脚本的布局字符串。

在正常预算下，仅使用此布局不保证出现搜索限制错误。
