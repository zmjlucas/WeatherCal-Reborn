# Maintain the layout documentation

The public site uses VitePress 1.6.4. Its source is `website/`.
English is the default language. Chinese pages use the `website/zh/` directory.
Research notes in `docs/research/` are not site pages.

## Preview and verify

Use the Node.js and pnpm versions in `package.json`.

```sh
pnpm install --frozen-lockfile
pnpm docs:dev
```

Before a commit, run the site checks:

```sh
pnpm docs:check
pnpm docs:preview
```

Open `/WeatherCal-Reborn/` on the preview server.
After a new build, restart the preview server to load the current asset list.
Open a deep page directly. Refresh the page.
Use the language menu on that page.
Make sure that the translated page opens at the same route.
Try the site on a narrow screen.

The checks exercise the actual layout parser and planner with fixed measurements.
They also exercise the local search index.
The output check finds missing pages, resources, anchors, and translations.
These checks do not measure native Scriptable text or prove STE vocabulary compliance.

## Write English first

Use [ASD-STE100 Issue 9](https://www.asd-ste100.org/STE_downloads.html) for the English text.
Read its rules and dictionary when you select words.

- Use short, complete sentences with a clear subject.
- Keep each procedural sentence at 20 words or fewer.
- Keep each descriptive sentence at 25 words or fewer.
- Give one action in each instruction. Use the imperative form.
- Put a necessary condition before the instruction.
- Prefer active sentences. Avoid complex verb constructions.
- Keep each paragraph on one topic, with no more than six sentences.
- Use an approved word with its specified meaning and part of speech.
- Use one technical noun for each software concept.
- Keep exact code identifiers and UI labels unchanged.

The [project terminology](../website/about/terminology.md) defines the software terms.
For example, `viewport` means the widget's available area in logical points.
It does not mean screen pixels.
Do not use a technical noun as a verb merely to shorten a sentence.

Review the English meaning against the current source before translation.
Then write the matching Chinese page.
Keep the same route, heading IDs, code imports, and technical facts.
Translate the prose, not the code identifiers.
When the English meaning changes, update the Chinese page in the same change.

Do not add its PDF or dictionary to the repository.
A sentence-length check is only an editing aid.
It cannot determine approved word meanings or parts of speech.

## Maintain shared examples

Canonical snippets are in `website/examples/`.
Both languages import these files with VitePress regions.
The tests in `tests/docs-examples.test.ts` verify their parser and planner behavior.
Update those tests when an example's intended behavior changes.

The diagrams show possible structures. They are not screenshots of Scriptable.
Label diagrams as schematic.
For screenshots, record the device, OS, widget family, and display settings.

## Maintain local search

Both the build and the browser use `website/.vitepress/search-tokenizer.mjs`.
The tokenizer supports Chinese words and exact code identifiers.
It also supplies character tokens for browsers without `Intl.Segmenter`.

Test these queries on the production preview:

- `自动布局`
- `保序`
- `viewport`
- `grow`
- `VIEWPORT_UNKNOWN`

Make sure that each result opens the correct language and heading.
Keep the base path in result URLs.

## Publish with GitHub Pages

The workflow is `.github/workflows/docs.yml`.
Pull requests run the build and checks.
Relevant pushes to `main` also deploy the site.
A manual run deploys only when its branch is `main`.
The deployment uploads only `website/.vitepress/dist`.

In repository **Settings → Pages**, select **GitHub Actions** as the source.
The repository must have Pages enabled before the first deployment.
The `github-pages` environment controls the deployment.
Its branch rules must permit `main`.

The default project URL is:

[WeatherCal Layout documentation](https://zmjlucas.github.io/WeatherCal-Reborn/)

After deployment, open this URL.
Use the workflow run and its deployment URL to verify publication.
If you change the repository name or domain, update the VitePress base path.
Then verify links, language changes, search results, and resources again.

## Update the documented version

Update `website/about/version.md` and its Chinese page when the engine contract changes.
Keep the documented baseline separate from the installed widget release version.
Do not claim that `main` or a release contains unmerged changes.
