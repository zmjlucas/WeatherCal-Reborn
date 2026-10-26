# 中国天气 Provider 调研

调研日期：2026-10-26（Asia/Shanghai）。范围：WeatherCal-Reborn / Scriptable 小组件；重点比较和风、彩云、心知、高德，补充华风爱科。本文是官方文档核查与选型建议，未使用账户密钥调用付费接口，也未进行 iPhone 实机测试或预报准确率评测。

## 结论

**优先选择和风天气 QWeather 作为中国地区主 Provider；彩云作为关注降雨提醒时的第二候选。** 这是基于字段覆盖、公开计费信息和个人项目接入成本的判断，不能据此声称它们在用户所在地一定比 OpenWeather 更准确。和风提供中国短临降水、预警、空气质量和生活指数，当前基础服务价格组有共享月免费额度；彩云也覆盖这些场景，但其当前文档明确限制分钟级接口的套餐权限。[和风服务目录](https://dev.qweather.com/docs/api/)、[和风定价](https://dev.qweather.com/docs/finance/pricing/)、[彩云综合接口](https://docs.caiyunapp.com/weather-api/v2/v2.6/6-weather.html)

| 候选 | 对当前需求的判断 | 最需要注意的限制 |
| --- | --- | --- |
| 和风 QWeather | 首选，适合增加中国预警、AQI、体感、小时/逐日趋势和降雨提醒 | 不同 API 代际字段不同；5 分钟降水不能显示成逐分钟数据；API Key 将有新的限额政策 |
| 彩云 Caiyun | 第二候选，适合以短临降雨和自然语言天气提示为核心 | 分钟级数据当前要求企业套餐；公开免费额度说明相互冲突，需查账户控制台 |
| 心知 Seniverse | 可用备选，但需先确认套餐字段和当前 V4 产品 | 旧 V3 免费字段少；旧文档的中国逐日降水概率限制会影响 Weather-Cal 的雨量百分比展示 |
| 高德 AMap | 适合非常简单的城市天气卡片或备用显示 | 公开天气接口字段明显少于完整天气服务，不能满足“更多天气数据”的主要目标 |

上表是下述官方资料的综合判断，不代表已有运行兼容性测试。

## 1. 和风天气：最值得先试

### 数据能力

- 新版经纬度天气接口提供实时天气、最多 **10 天逐日 / 240 小时逐小时**；城市接口为 **3–30 天 / 24–168 小时**。两套产品应分开比较，不能将“30 天”和“240 小时”拼成同一接口规格。[天气接口目录](https://dev.qweather.com/docs/api/weather/)
- 实时字段包括温度、体感、湿度、风/阵风、降水、气压、能见度、露点、云量、紫外线。[实时天气](https://dev.qweather.com/docs/api/weather/weather-current/)
- 新版逐日接口含日出日落、月升月落/月相、昼夜天气及降水概率，适合替代 Weather-Cal 的基础预报与日出日落显示。[每日预报](https://dev.qweather.com/docs/api/weather/weather-daily-forecast/)
- 中国短临接口 `/v7/minutely/5m` 返回未来 **2 小时、每 5 分钟一个值**，`precip` 是 **5 分钟累计降水量（mm）**，并带自然语言摘要。不要把“分钟级”解释成每分钟一个点。[分钟级降水接口](https://dev.qweather.com/docs/api/minutely/minutely-precipitation/)
- 预警覆盖表明确包含 `cn`；空气质量有实况、24 小时逐小时及 3 天逐日预报，并有中国 AQI 说明；生活指数包含穿衣、洗车、紫外线等。[预警覆盖](https://dev.qweather.com/docs/api/warning/alert-coverage/)、[空气质量](https://dev.qweather.com/docs/api/air-quality/)、[中国 AQI](https://dev.qweather.com/docs/api/air-quality/china-aqi/)、[生活指数](https://dev.qweather.com/docs/api/indices/)

### 费用、认证及归因

当前公开定价中，天气、分钟预报、预警、指数、空气质量、GeoAPI、天文等属于同一“天气和基础服务”价格组：**每月合计前 50,000 次为 0 元，接下来 950,000 次为 0.0007 元/次**。这不是每个接口分别赠送 50,000 次，也不是永久免费无限调用；超过额度按量收费。[按量定价](https://dev.qweather.com/docs/finance/pricing/)

个人使用的估算示例：假设每次刷新请求 6 个接口、每小时 4 次、每月 30 天，共 `6 × 4 × 24 × 30 = 17,280` 次，低于上述额度。此计算不含重试、额外位置、其他应用及用户，也不代表 iOS 实际刷新频率。

请求需使用账户专属 API Host；支持 JWT 或 `X-QW-Api-Key` 请求头。JWT 使用 Ed25519，Token 最长有效期 24 小时，不能把一次生成的 Token 当作永久 API Key。[开始使用](https://dev.qweather.com/en/docs/start/)、[身份认证](https://dev.qweather.com/docs/configuration/authentication/)

**认证政策有临近变化和文档不一致：**中文认证页及英文认证页写 2027-01-01 起限制 API Key 每日请求量，英文“Project and Credential”页写 2027-02-01；本次未找到这些页面明确给出的新日限额。因此可用 API Key 做当前个人试用，但长期方案应预留 JWT，并在正式接入时以控制台公告确认日期/额度。[中文认证页](https://dev.qweather.com/docs/configuration/authentication/)、[英文认证页](https://dev.qweather.com/en/docs/configuration/authentication/)、[英文凭据页](https://dev.qweather.com/en/docs/configuration/project-and-key/)

展示需清晰注明“和风天气/QWeather”并链接其官网；预警、空气质量的来源还需按归因规则保留。新版响应的 `metadata.attributions` 也要求与数据一起显示。不要把免费请求额度理解为可忽略归因或任意转售数据。[注明来源](https://dev.qweather.com/docs/terms/attribution/)、[新版实时响应](https://dev.qweather.com/docs/api/weather/weather-current/)

## 2. 彩云天气：关注降雨时重点评估

v2.6 综合接口一次返回实况、小时和逐日数据；小时上限 360 小时、逐日通常上限 15 天，**实际返回长度受套餐限制**。`minutely` 仅在有企业套餐权限时返回；`alert=true` 仍需要预警权限。不能依据响应示例认为所有账户都有全部字段。[综合接口](https://docs.caiyunapp.com/weather-api/v2/v2.6/6-weather.html)

官方覆盖表包含实时/预报 PM2.5、AQI，逐日含日出日落和生活指数；短临为未来两小时逐分钟降水强度，并给出每半小时降水概率与文字描述。官方同时说明实况/短临约 1 km，而常规小时/逐日为 9–13 km，不能把所有彩云数据都称作 1 km 精度。[时空变量覆盖](https://docs.caiyunapp.com/weather-api/v2/v2.6/tables/coverage.html)

v2.6 支持 Token，也支持 App Key + App Secret 签名，官方推荐后者；路径是“经度,纬度”。中国大陆 v2.x 坐标要求 **GCJ-02**，其他地区使用 WGS84。接入时必须确认定位数据坐标系，不能直接假定 GPS 原始坐标可原样传入。[认证](https://docs.caiyunapp.com/weather-api/v2/v2.6/auth.html)、[坐标 FAQ](https://docs.caiyunapp.com/weather-api/q.html)

**当前费用无法从公开网页得出唯一可靠结论：**

- 公共价格页写免费 1,000 次/天、1 个月；个人档 1,200 元/月。[公开价格页](https://www.caiyunai.com/api/pricing.html)
- 用户协议写认证用户免费额度合计 10,000 次、有效期 6 个月。[用户协议](https://platform.caiyunapp.com/user/user_agreement/)
- 当前开发文档将实际套餐价格指向登录后的管理平台，并说明套餐影响访问权限和 QPS。[当前计费说明](https://docs.caiyunapp.com/weather-api/billing.html)

因此不承诺“彩云长期免费”“每日固定免费 1,000 次”或“低价套餐包含短临”。尤其在选择彩云的原因正是分钟降雨时，应先确认账户具备该权限。公开协议要求在应用显著位置标注彩云 LOGO 或数据来源文字；具体账户合同中的商用授权条件仍需单独确认。[公开用户协议](https://platform.caiyunapp.com/user/user_agreement/)

## 3. 心知天气：字段完整度取决于产品

公开 V3 文档写：实况免费用户仅有天气文字、代码、气温；付费用户才有更多字段，中国城市暂不支持云量及露点。逐日最多 15 天，免费仅 3 天；该旧文档明确把 `precip` 降水概率标为仅支持国外城市。它可能无法补足当前中国雨概率需求，应以实际购买的当前产品验证，不能直接套用旧 V3 限制到 V4。[实况](https://docs.seniverse.com/api/weather/now.html)、[逐日](https://docs.seniverse.com/api/weather/daily.html)

官方产品资料列有 24 小时逐小时、灾害预警、空气质量、生活指数、日出日落和月相；分钟降水接口覆盖中国 1 km 网格。购买页还把 2 小时分钟降水、高精度网格产品列在联系商务报价的部分。[产品数据列表](https://docs.seniverse.com/product/data/trial.html)、[分钟降水](https://docs.seniverse.com/api/weather/minutely.html)、[购买页](https://www.seniverse.com/buy?type=package_sub)

当前官方价格页列免费版覆盖国内 370 个主要城市，10 万次/月、1 次/秒，仅 3 项数据：基础实况、3 天预报和 6 项生活指数。开发者套餐为 99 元起/年，限个人购买一次且不可商用；访问量套餐为 599 元起/年。免费请求次数多不等于字段丰富，不能将付费产品目录当作免费权限。[官方价格方案](https://www.seniverse.com/pricing)

旧 V3 文档抓取记录较旧，需与当前控制台产品核对。官方已有 V4 示例仓库，建议生产场景在后端签名并避免暴露密钥；不能直接把 Node.js 示例依赖当作 Scriptable 内置能力。[V4 官方示例](https://github.com/seniverse/seniverse-api-v4-demos)

## 4. 高德天气：基础数据足够，扩展数据不足

公开天气接口使用 Web 服务 Key + 行政区 `adcode`；`base` 返回天气、温度、风向风力、湿度，`all` 返回逐日昼夜天气与温度。该接口公开字段没有逐小时、短临、AQI、预警、日出日落或生活指数，故不适合作为此次“丰富天气数据”的主替换源。文档对预报列表文字描述为当天/第二天/第三天；本次未持 Key 验证实际返回天数，不把常见教程的“四天”作为已确认契约。[天气查询官方文档](https://developer.amap.com/api/webservice/guide/api/weatherinfo)

现行价格页列天气查询个人认证月配额 **5,000 次**，并注明非商业用途免费月配额自注册认证起有效 **1 年**；天气预报流量包 **30 元/万次**。这不是 5,000 次/天，也不是永久免费的承诺。账户实际配额和商业使用授权应查看控制台。[官方服务定价](https://developer.amap.com/upgrade)

## 5. 可追加评估：华风爱科

如果希望比较另一家中国天气服务，华风爱科有正式开放平台。其中国短临接口返回约 2 小时降水，示例时间间隔为 6 分钟；文档提供标准测试 Key 的 30 天、500 次/天、5 QPS 试用，全球短临需单独开通。它适合作为额外对照，但这是限期试用；本次未完成其全套天气字段/长期价格核查，因此不排在和风之前。[官方分钟预报文档](https://platform.weathercn.com/doc/api/minute-forecast.html)

## 对 WeatherCal-Reborn 的实际意义

当前 checkout 只有 `AGENTS.md`、`README.md`、`CHANGELOG.md`、`LICENSE`，尚无可审计的 Provider 实现；README 将项目描述为 mzeryck/Weather-Cal 的重写。所以下列兼容性判断来自上游源码，不能等同于用户手机当前安装版本。

上游 `weather-cal-code.js` 的 `setupWeather` 主要读取当前温度/天气、逐小时与逐日图标/温度、下一小时及次日降水概率；`setupSunrise` 读取日出日落。相关请求明确带 `exclude=minutely,alerts`，内部预报还只处理 8 项。因此“展示太少”可能同时涉及请求参数和小组件渲染：仅替换服务商不会自动出现 AQI、预警或降雨图。[上游源码](https://raw.githubusercontent.com/mzeryck/Weather-Cal/main/weather-cal-code.js)

OpenWeather One Call 3 本身提供 48 小时、8 天、1 小时分钟预报；其当前预警来源表列有香港/澳门，但没有列中国大陆来源。这里应区分产品总体能力、中国特定数据覆盖和上游使用范围，不把缺少大陆预警来源扩大解释为整个中国基础天气不可用。[One Call 3 官方文档](https://openweathermap.org/api/one-call-3)

针对后续接入，最有价值的核查点是：

1. **先试和风新经纬度接口**：当前天气 + 小时 + 逐日已经覆盖基础小组件需求，另按显示需求获取 AQI、预警、短临和指数。保留响应来源字段。
2. **数据单位与字段必须映射**：新版和风湿度/概率是 0–1，数值常带单位对象；短临累计雨量不是雨概率；不同来源的 AQI 标准不可混成同一数值尺度。[和风实时](https://dev.qweather.com/docs/api/weather/weather-current/)、[和风逐日](https://dev.qweather.com/docs/api/weather/weather-daily-forecast/)、[和风短临](https://dev.qweather.com/docs/api/minutely/minutely-precipitation/)
3. **经纬度顺序不能复用一套字符串**：和风新版路径是纬度/经度，和风短临参数和彩云路径为经度,纬度；心知 V3 短临为纬度:经度。彩云另有大陆坐标系转换要求。以上均应按各接口引用的官方契约处理。
4. **Scriptable 有 HTTP 请求基础能力**：官方 `Request` 支持自定义 headers 和 `loadJSON()`，说明这些 REST 接口在调用方式上可适配。但没有实机验证 JWT 签名库、网络访问、Gzip 处理或后台刷新；浏览器 CORS 能否通过也不能据此直接推出，若后续使用 WebView 发请求需单独验证。[Scriptable Request](https://docs.scriptable.app/request/)
5. **以所在地做对照再评准确率**：记录同地点/同预报时效下的缺失率、返回延迟、更新时间、雨开始/停止时间偏差，以及预警来源。本文只支持优先试用顺序，不支持“某家一定最准”的结论。

## 尚未验证的边界

- 未登录任何服务控制台，未申请/购买套餐，未调用带用户密钥的天气 API；套餐实际权限、实时大陆网络可达性均待实测。
- 彩云公开费用相互冲突、和风 API Key 限制生效日期存在官方页面差异，已在对应条目明确保留；心知公开价格已核实，具体账户权限仍未验证。
- 除和风明确的归因文档及上述公开服务条件外，本次未完成各家具体账户合同的商用、缓存、再分发许可核查；开源发布代码与公开分发服务商天气数据是不同事项。
- 未研究所有国内厂商，也未把抓取 App 私有接口或第三方代理当作同等可靠的 Provider。候选比较覆盖 4 家主要服务，另提供 1 家可追加对照。
