# 新布局系统文档站与 GitHub Pages 调研

调研日期：2026-10-27（Asia/Shanghai）。范围：为 WeatherCal-Reborn 新布局系统选择文档站形式，比较四个建站候选，提炼五条文档实践。本文是选型研究，不是实施计划；本轮未安装文档框架、搭建站点或部署 GitHub Pages。

后续实现说明：本文保留调研时的实现快照。新布局后来增加了 viewport 自动检测、预设优先和字号回退；使用方式以 [当前布局契约](../LAYOUT.md) 和 [文档站](../../website/index.md) 为准。

## 结论

**优先考虑 VitePress 稳定版；如果中文全文搜索希望尽量采用现成方案，重点比较 Astro Starlight。** 这是针对本仓库已有 Markdown、Node/pnpm、TypeScript 工具链，以及以布局教程、参数参考和示例为主的需求所作的判断，不是性能排名。VitePress 支持从文件导入代码片段和在 Markdown 中使用 Vue 组件；Starlight 默认提供 Pagefind 全文搜索，Pagefind 的扩展发行版明确支持中文分词。[VitePress 代码片段](https://vuejs.github.io/vitepress/v1/guide/markdown#import-code-snippets)、[Vue 组件](https://vuejs.github.io/vitepress/v1/guide/using-vue)、[Starlight 搜索](https://starlight.astro.build/guides/site-search/)、[Pagefind 多语言](https://pagefind.app/docs/multilingual/)

Docusaurus 适合以后确实需要同时维护多个版本文档、翻译流程和较多 React 交互内容的情况；Just the Docs 适合以静态文字为主、接受 Jekyll/Ruby 工具链的情况。两者都能部署到 Pages，但当前需求不足以仅凭功能数量优先选择它们。维护复杂度的判断基于下文的工具链和扩展方式，未做安装体积、构建时长或浏览器性能测量。

**Material for MkDocs 未列入新站推荐候选。** 调研当日，其官方首页明确标示 **2027-05-05 结束生命周期**，关键维护持续到该日，并指向继任项目 Zensical。它仍有可学习的文档写法，但新建站应考虑随之而来的迁移工作。这个状态只指 Material for MkDocs，不能推广为 MkDocs 本身停止维护。[Material 官方公告](https://squidfunk.github.io/mkdocs-material/)

## 本项目的文档边界

- 本调研工作区 HEAD 为 `2873753`；新的布局实现位于另一个本地工作区的 `codex/adaptive-layout` 分支，核查时 HEAD 为 `cd687ce`。其 [LAYOUT.md](/Users/lucas/.codex/worktrees/0209/WeatherCal-Reborn/docs/LAYOUT.md) 已说明语法、viewport、参数、内置 item、自定义 `ItemModule`、诊断和设备校准。不能据此声称功能已经发布到 `main` 或 `dev`。
- 当前工作区的 [FEATURES.md](/Users/lucas/.codex/worktrees/2a75/WeatherCal-Reborn/docs/FEATURES.md) 和 [DEVELOPMENT.md](/Users/lucas/.codex/worktrees/2a75/WeatherCal-Reborn/docs/DEVELOPMENT.md) 仍包含旧 DSL/ASCII 布局说明。把整个 `docs/` 直接生成网站，会混入两套契约；选主题之前，应先明确哪些文字属于新的使用文档。
- 新文档必须准确表达：`auto` 可以重排直接子项，`flow` 保持阅读顺序，`row`/`column` 固定结构，手动容器可以嵌套自动区域；viewport 必须明确配置。新实现替换旧输入语法，不提供旧布局兼容转换。本文所说“文档适用版本”是读者可见的分支、commit 或发布说明，不是在布局语法中增加版本字段。[新布局契约](/Users/lucas/.codex/worktrees/0209/WeatherCal-Reborn/docs/LAYOUT.md)
- 仓库已有 Node/pnpm/TypeScript 工具链及检查 workflow；当前 [check.yml](/Users/lucas/.codex/worktrees/2a75/WeatherCal-Reborn/.github/workflows/check.yml) 没有 Pages 发布任务。Git remote 对应 `zmjlucas/WeatherCal-Reborn`；若使用默认项目 Pages 地址，路径前缀应为 `/WeatherCal-Reborn/`。这只是未来部署所需配置，不代表站点已启用。[GitHub 项目站地址规则](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages#types-of-github-pages-sites)

## 四个候选及第一方案例

下面的站点由相应项目维护，可直接参考其导航、代码展示和内容组织；本表不据域名或页面外观推断其实际托管平台。框架支持 Pages 和某个示例站正在使用 Pages 是两件事。

| 候选 | 第一方实际文档站 | 值得借鉴的方式 | 对本项目的判断 |
| --- | --- | --- | --- |
| VitePress | [VitePress 1.6.4 文档](https://vuejs.github.io/vitepress/v1/) | Guide 与 Reference 分开；代码片段、分组与行高亮；Markdown 内可嵌 Vue | 首选；保持文字为主，交互按需添加；稳定版中文分词需验证 |
| Astro Starlight | [Starlight 文档](https://starlight.astro.build/) | Guides、Components、Reference 分层；组件页面并列展示用法和效果 | 强备选；内置搜索适合中文文档，但内容目录与 Astro 配置需要接入 |
| Docusaurus | [Docusaurus 文档](https://docusaurus.io/docs) | 页面显示文档版本，提供语言与版本切换；教程与参考分层 | 适合明确的多版本维护需求；目前可能引入过多配置与维护工作 |
| Just the Docs | [Just the Docs 文档](https://just-the-docs.com/) | 简洁的章节层级、面包屑、页内导航和搜索 | 静态手册可选；与现有 TS 工具链协同、中文搜索和交互需要额外处理 |

### 1. VitePress：最贴近现有 Markdown 与 TypeScript 工作方式

**内容与示例。** 稳定文档直接使用 `.vitepress/config.ts`，支持 Markdown 代码块、行高亮、代码分组、从文件或指定 region 导入代码。Markdown 中可以直接导入 Vue 组件；组件需满足 SSR 条件。对本项目的意义是让布局说明继续主要用 Markdown 编写，并让例子引用受检查的源文件，而不是多处复制。[Markdown 扩展](https://vuejs.github.io/vitepress/v1/guide/markdown)、[Vue in Markdown](https://vuejs.github.io/vitepress/v1/guide/using-vue)

**搜索，尤其中文。** 稳定版有基于 MiniSearch 的浏览器本地全文搜索，也支持 Algolia DocSearch；搜索界面有中文翻译配置，并开放 `tokenize`。但“界面中文”不等于“中文分词已处理”：1.6.4 的索引和客户端源码将用户配置传给 MiniSearch，没有注入主站新文档所述的默认中文分词器。MiniSearch 默认按空白和标点切词，连续中文短句的召回需要针对本项目语料验证。[稳定版搜索](https://vuejs.github.io/vitepress/v1/reference/default-theme-search)、[1.6.4 索引源码](https://github.com/vuejs/vitepress/blob/v1.6.4/src/node/plugins/localSearchPlugin.ts)、[客户端源码](https://github.com/vuejs/vitepress/blob/v1.6.4/src/client/theme-default/components/VPLocalSearchBox.vue)、[MiniSearch 默认配置](https://lucaong.github.io/minisearch/classes/MiniSearch.MiniSearch.html#constructor)

**版本区别。** 调研当日 `vitepress.dev` 导航显示 `2.0.0-alpha.21`，其搜索文档写明默认使用 `Intl.Segmenter` 处理中文和日文；官方另链接到 `vuejs.github.io/vitepress/v1/` 的 `1.6.4` 文档。本报告以该稳定文档为能力基线，不把 alpha 的新增行为当成稳定版承诺。[当前主站搜索](https://vitepress.dev/reference/default-theme-search)、[稳定版搜索](https://vuejs.github.io/vitepress/v1/reference/default-theme-search)

**国际化与版本文档。** 有内置 `locales`、语言目录和每种语言的主题配置。本次稳定版官方指南中未找到与 Docusaurus 相同的文档快照 CLI，因此不能把语言切换、普通导航链接当成内置版本管理。当前可先维护一套中文新布局文档，以适用范围说明对应实现；将来确有多个受支持版本，再评估归档策略。[VitePress 国际化](https://vuejs.github.io/vitepress/v1/guide/i18n)

**Pages 与维护。** 官方提供 GitHub Actions 示例，支持用 `base` 指定项目子路径；默认产物位于 `docs/.vitepress/dist`。对本仓库而言，新增一套 Node 文档依赖比再引入 Python 或 Ruby 更容易沿用既有工作方式；但 Vue 定制和中文 tokenizer 仍是新增维护内容。[VitePress 部署](https://vuejs.github.io/vitepress/v1/guide/deploy)

### 2. Astro Starlight：中文搜索与文档组件较完整

**内容与交互。** Starlight 支持 Markdown，以及在 MDX/Markdoc 中使用组件；内置 Steps、Tabs、Cards、Code 等文档组件。`Code` 可以用 Vite `?raw` 导入真实文件。需要可交互布局示意时，Astro 的框架组件可通过 `client:*` 指令在浏览器加载；这需要编写演示组件，并非自动把任意 TypeScript 模块变成交互界面。[组件用法](https://starlight.astro.build/components/using-components/)、[导入代码](https://starlight.astro.build/components/code/)、[Astro 交互组件](https://docs.astro.build/en/guides/framework-components/#hydrating-interactive-components)

**搜索，尤其中文。** 默认提供 Pagefind 全文搜索，无需接第三方搜索服务；索引在构建后供静态页面使用。Pagefind 按 HTML `lang` 组织各语言索引，扩展发行版支持中文、日文、韩文分词；官方说明 `npx pagefind` 默认使用该扩展版。这是比“有中文 UI”更直接的中文能力证据，但本次没有安装 Starlight 核查其实际锁定依赖，仍需在最终构建中验证中文句中词、英文 API 名称和结果链接。[Starlight 搜索](https://starlight.astro.build/guides/site-search/)、[Pagefind 语言处理](https://pagefind.app/docs/multilingual/)

**国际化与版本文档。** 内置多语言路由、界面翻译和未翻译页面的默认语言回退。版本化文档工具 `starlight-versions` 被官方列在社区插件区，不能称为核心自带能力。[Starlight i18n](https://starlight.astro.build/guides/i18n/)、[插件目录](https://starlight.astro.build/resources/plugins/)

**Pages 与维护。** Astro 官方给出 Pages 部署指南，要求按项目地址配置 `site` 和 `base`，并选择 GitHub Actions 发布。Astro 支持 TypeScript；对本仓库的成本主要是引入 Astro 的内容组织、构建配置，以及将来交互组件的客户端加载规则。它适合作为 VitePress 中文搜索验证不满意时的替代，不必为了首页效果一开始就定制主题。[Pages 部署](https://docs.astro.build/en/guides/deploy/github/)、[TypeScript 支持](https://docs.astro.build/en/guides/typescript/)

### 3. Docusaurus：版本维护能力强，当前需求未必用得上

**内容与交互。** 支持 TypeScript 配置及主题组件；MDX 可以嵌入 React。官方 `theme-live-codeblock` 可添加交互代码编辑器，但其示例基于 React Live，不能直接视为 WeatherCal DSL 的运行器或 Scriptable 预览器。[TypeScript](https://docusaurus.io/docs/typescript-support)、[MDX 与 React](https://docusaurus.io/docs/markdown-features/react)、[交互代码块](https://docusaurus.io/docs/markdown-features/code-blocks#interactive-code-editor)

**搜索，尤其中文。** 第一方支持重点是 Algolia DocSearch；官方将本地搜索等其他方案明确列为社区维护。中文全文检索需随所选搜索服务或插件核验，不应从 Docusaurus 有中文站点直接推断默认安装就有可用的本地中文搜索；申请 DocSearch 也不等于已经获准接入。[搜索方案及维护方](https://docusaurus.io/docs/search)

**国际化与版本文档。** 有内置 i18n 和文档版本 CLI，可保存某次文档内容的快照，在当前内容继续变化时保留旧版。官方同时提醒版本化会增加贡献者维护难度。当前新布局明确替换旧语法，保留全部旧版本并不是建站前提；只有项目决定同时支持不同发布版本时，这项能力才成为主要优势。[i18n](https://docusaurus.io/docs/i18n/introduction)、[文档版本](https://docusaurus.io/docs/versioning)

**Pages 与维护。** 生成静态 `build` 目录；部署需设置 `url`、`baseUrl`，官方对 Pages 建议明确设置 `trailingSlash`。本项目能继续使用 Node/TS，但还要维护 React/MDX、搜索方案，以及可能增加的版本与语言副本；因此列为后续需求明确时的候选。[部署及 URL 配置](https://docusaurus.io/docs/deployment)

### 4. Just the Docs：简洁手册可用，但不会省掉所有工程配置

**内容与交互。** 它是 Jekyll 主题，页面使用 Markdown、Liquid 或 HTML；本地预览及官方模板采用 Gemfile/gem 工作方式。页面支持代码高亮、主题布局与 includes 定制，但复用 TS 布局逻辑需要另外安排 JS 构建或嵌入。本仓库本来没有 Ruby 文档工具链，因此“模板简单”不能直接等同于维护成本最低。[主题说明](https://just-the-docs.com/)、[官方模板](https://just-the-docs.github.io/just-the-docs-template/)、[定制入口](https://just-the-docs.com/docs/customization/)

**搜索，尤其中文。** 内置 Lunr 客户端搜索，索引由 Jekyll 生成，可按标题拆分章节；默认 tokenizer 分隔符是空白、连字符和斜线。该配置本身不是中文分词器，本次官方搜索页也没有确认默认中文词切分方案，故需另行验证或扩展。[搜索与 tokenizer](https://just-the-docs.com/docs/search/)

**国际化与版本文档。** 本次核查的主题配置和定制文档中，没有发现与 Starlight 的翻译回退或 Docusaurus 的版本快照相当的核心工作流。可借助 Jekyll 页面、集合和定制构建组织内容，但不能因此称为现成的多语言、多版本系统。[配置](https://just-the-docs.com/docs/configuration/)、[定制](https://just-the-docs.com/docs/customization/)

**Pages 与维护。** 官方模板提供 GitHub Pages/Actions 构建发布方式，也说明如何放入现有仓库的 `docs` 目录；Jekyll 的项目子路径通过 `baseurl` 配置。若需求始终是几十页文字和静态截图，它是可用选项；若希望经常复用 TS 示例及加入布局演示，前两个方案更自然。[模板及现有仓库说明](https://just-the-docs.github.io/just-the-docs-template/)、[Jekyll 配置](https://jekyllrb.com/docs/configuration/default/)

### 未入选新站候选：Material for MkDocs

[Material 官方文档](https://squidfunk.github.io/mkdocs-material/) 仍可作为第五个阅读案例：配置说明、代码注释、内容标签页、搜索结果组织都值得观察。它有基于 Lunr 的客户端搜索，搜索插件明确支持 `jieba` 中文分词及用户词典；版本选择通过外部工具 `mike` 集成，语言选择器则可以链接各语言站点。其官方发布示例使用 Python 和 MkDocs，并支持 Pages。[搜索插件](https://squidfunk.github.io/mkdocs-material/plugins/search/)、[版本文档](https://squidfunk.github.io/mkdocs-material/setup/setting-up-versioning/)、[语言选择](https://squidfunk.github.io/mkdocs-material/setup/changing-the-language/)、[发布方式](https://squidfunk.github.io/mkdocs-material/publishing-your-site/)

这些能力不抵消已公布的 **2027-05-05** 生命周期终点。本项目没有既有 MkDocs 站点需要保留，故本轮不建议从它开始；Zensical 仅是官方公告中的继任者，本次没有完整核查它，不将其自动补进推荐名单。[Material 生命周期公告](https://squidfunk.github.io/mkdocs-material/)

## 最值得采用的五条文档实践

以下是根据官方案例和本地布局契约提出的内容建议，尚未实施。它们独立于最终选择的主题。

### 1. 以读者任务分层，让 viewport 出现在第一份教程里

Diátaxis 区分教程、操作指南、技术参考和解释；Vue 文档也把 Quick Start、Guide、Tutorial、Examples、API 和 Error Reference 分成独立入口。这比把所有内容挤进一篇语法清单更适合新布局系统。[Diátaxis 四类文档](https://diataxis.fr/)、[Vue 文档入口](https://vuejs.org/guide/introduction.html)

| 读者需要 | 本项目适合的内容 |
| --- | --- |
| 第一次成功运行 | 选 widget family → 配置对应 viewport → 复制最小 `auto[...]` → 看预期结果；示例尺寸明确为实验值 |
| 完成某件事 | 固定日期在顶部、让天气自动排、保持事件阅读顺序、调整两块区域的空间 |
| 查参数 | `row`、`column`、`auto`、`flow`、`space`；属性默认值、单位、适用容器和约束 |
| 理解行为 | `auto` 为什么可重排、`flow` 如何保序、手动组边界、内容放不下时为何报告诊断 |

`viewport` 不能放到附录：当前配置默认为空，缺失时会得到 `VIEWPORT_UNKNOWN`；屏幕尺寸也不是 widget 可用尺寸。首页和入门页应把这个前提放在可复制示例之前。[新布局 viewport 说明](/Users/lucas/.codex/worktrees/0209/WeatherCal-Reborn/docs/LAYOUT.md)

### 2. 示例同时展示输入、约束和结果，代码尽量只有一个来源

VitePress 可以导入文件/region；Starlight 的 `Code` 可以导入源文件。借鉴它们，把常用布局例子作为可检查的文件，并在文档中引用，降低文字与实现各自演进的风险。[VitePress 片段导入](https://vuejs.github.io/vitepress/v1/guide/markdown#import-code-snippets)、[Starlight 代码导入](https://starlight.astro.build/components/code/#display-imported-code)

每个布局示例宜包含：容器选择原因、完整输入、family/viewport、预期阅读顺序，以及一张结果图或结构示意。用同一组 items 对照 `auto`、`flow`、手动布局和嵌套自动区域，比四个互不相干的例子更容易说明差异。可以用代码组并排呈现；不必在首版文档中实现在线 Playground。

未来若加入浏览器示意，可评估复用纯 TS parser/planner 和固定测量 fixtures；浏览器结果应标为结构/规划示意。Scriptable 字体、原生栈尺寸与实机效果仍需设备验证，不能把网页演示称作像素级预览。[规划器](/Users/lucas/.codex/worktrees/0209/WeatherCal-Reborn/src/layout/planner.ts)、[规划器测试](/Users/lucas/.codex/worktrees/0209/WeatherCal-Reborn/tests/layout-planner.test.ts)、[设备校准说明](/Users/lucas/.codex/worktrees/0209/WeatherCal-Reborn/docs/LAYOUT.md)

### 3. 给诊断码稳定入口，按“原因—复现—修复”写

Rust 官方错误页以错误编号为入口，先说明发生原因，再给错误示例和修正方式。新布局已有明确诊断码，适合采用同样的短页结构。[Rust E0382 错误说明](https://doc.rust-lang.org/error_codes/E0382.html)

例如 `VIEWPORT_UNKNOWN` 页解释缺的是哪个 family 的设置；`NO_CANDIDATE_FITS` 页展示受限空间与内容需求，而不是笼统建议“减少内容”；`SEARCH_LIMIT_REACHED` 页说明搜索预算与未找到可行解的区别。每页应链接对应参数和可复现输入，并以当前源码诊断语义为准。这样用户既可从错误码搜索，也可从教程进入排错说明。[诊断契约](/Users/lucas/.codex/worktrees/0209/WeatherCal-Reborn/docs/LAYOUT.md)、[诊断类型](/Users/lucas/.codex/worktrees/0209/WeatherCal-Reborn/src/layout/types.ts)

### 4. 把中文搜索当成内容验收项，API 名称保留英文

VitePress 与 Just the Docs 的 tokenizer 边界、Pagefind 的按语言索引规则都说明，搜索框存在并不足以保证中文内容容易找到。[VitePress 稳定版搜索](https://vuejs.github.io/vitepress/v1/reference/default-theme-search)、[Just the Docs 搜索](https://just-the-docs.com/docs/search/)、[Pagefind 多语言搜索](https://pagefind.app/docs/multilingual/)

标题和正文宜使用“自动布局 `auto`”“保序布局 `flow`”“可用区域 `viewport`”这类中英对应表达。未来建站时，用真实问题检查结果：`自动布局`、句子中间的 `保序`、`viewport`、`grow`、`VIEWPORT_UNKNOWN`；确认命中具体章节，并且在 `/WeatherCal-Reborn/` 子路径下能正确打开。搜索界面翻译、全文分词、语言索引和结果 URL 应分别检查，不能只测试首页的搜索按钮。

### 5. 明确文档对应哪份实现，控制翻译和历史版本的维护范围

Docusaurus 的版本页说明快照的用途，也提醒多版本维护的成本；VitePress 目前把稳定文档与 alpha 文档区分展示。可借鉴的是让读者清楚“这份文档对应什么”，无需立刻复制整站建立多版本树。[Docusaurus 版本文档](https://docusaurus.io/docs/versioning)、[VitePress 稳定文档](https://vuejs.github.io/vitepress/v1/)

对本项目，尚未发布的新布局页应写明适用分支/commit；正式发布后改成对应发布版本。旧语法若保留作迁移说明，应单独标明历史范围，不出现在新教程的推荐示例中。先完成一套中文内容，再按实际需求维护其他语言；框架支持 i18n 不会自动翻译或保证译文同步。这些建议不改变“无旧布局兼容层、无布局版本字段”的实现要求。

## GitHub Pages 官方部署要点

**Pages 可以托管这四类站点的静态产物。** GitHub Pages 提供 HTML/CSS/JS 静态托管；采用哪个框架不要求换托管平台。未来布局演示可以在浏览器执行 JS，但不能把 Pages 当作常驻服务器来运行 Scriptable。[GitHub Pages 定义](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)

### 项目子路径必须覆盖导航、资源和搜索结果

如果没有自定义域名，本仓库默认项目站将是 `https://zmjlucas.github.io/WeatherCal-Reborn/`。以下是按官方配置规则推导的值，尚未写入任何配置文件，也未验证该地址已上线。

| 方案 | 本项目需要关注的配置 | 静态产物 |
| --- | --- | --- |
| VitePress | `base: '/WeatherCal-Reborn/'` | 若源目录为 `docs`，默认 `docs/.vitepress/dist` |
| Astro Starlight | `site: 'https://zmjlucas.github.io'`，`base: '/WeatherCal-Reborn'` | 默认 `dist` |
| Docusaurus | `url: 'https://zmjlucas.github.io'`，`baseUrl: '/WeatherCal-Reborn/'`；明确 `trailingSlash` | 默认 `build` |
| Just the Docs/Jekyll | `url: 'https://zmjlucas.github.io'`，`baseurl: '/WeatherCal-Reborn'` | 默认 `_site` |

配置依据：[VitePress](https://vuejs.github.io/vitepress/v1/guide/deploy#setting-a-public-base-path)、[Astro](https://docs.astro.build/en/guides/deploy/github/)、[Docusaurus](https://docusaurus.io/docs/deployment#configuration)、[Jekyll](https://jekyllrb.com/docs/configuration/default/)。应在带项目子路径的生产构建上检查深层链接直接访问、刷新、图片、代码资源和搜索跳转；开发服务器的根路径正常不能代替这些检查。

### 选择构建产物发布，避免混淆两种发布方式

GitHub 支持从分支的根目录或 `/docs` 发布，也支持自定义 GitHub Actions。官方建议需要非 Jekyll 构建，或不希望单独提交编译产物时使用 Actions。对本项目，VitePress/Starlight/Docusaurus 都更适合在 Actions 中构建，再上传产物。[发布源规则](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

官方自定义 workflow 由 `configure-pages`、构建、`upload-pages-artifact` 和 `deploy-pages` 等步骤组成；部署 job 需要 `pages: write`、`id-token: write`，并依赖成功的构建 job，使用 `github-pages` environment。实际接入时应沿用当时的官方 action 版本和仓库包管理配置；本文不复制一份可能迅速过期的完整 YAML。[自定义 Pages workflow](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)

`.nojekyll` 主要是将预构建文件提交到发布分支、避免默认 Jekyll 处理时需要理解的约定；使用自定义构建和 Pages artifact 部署时，应按对应工作流处理，不能机械套用“必须建 gh-pages 分支”。[GitHub 对分支产物的说明](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

针对本仓库的建议是：普通变更检查文档构建和链接，正式部署只从明确选择的发布来源进行；产物只包含选定的公开文档、示例和静态资源。现有研究笔记和旧布局说明是否进入站点，应由内容范围决定，不由“它们恰好在 docs 里”决定。此处描述的是发布原则，尚未更改仓库设置或 workflow。

Pages 当前已发布站点大小上限为 1 GB，月带宽软限额为 100 GB，部署超过 10 分钟会超时；每小时 10 次构建的软限额不适用于通过自定义 Actions 构建发布。对这类文档，更实际的控制点是截图、录屏和重复版本产物的大小。[Pages 官方限制](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)

## 尚未验证的事项

- 未安装四个候选或比较真实构建产物；维护复杂度、首选顺序是针对仓库现状的判断。
- 未在目标浏览器、移动设备或中国大陆网络上测试搜索、字体、静态资源与 Pages 可达性；中文分词能力的官方说明不等于本项目搜索质量已验收。
- 未验证任何新布局在 Scriptable/iPhone 上的最终排版；本研究只评估如何准确呈现实现契约与已有证据。
- 未操作 GitHub Pages 设置，未添加域名或部署 workflow；当前远端站点是否已启用不在本次核查结果内。
