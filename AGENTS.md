# WeatherCal-Reborn

When working with this repository, follow the guidelines below:

- Avoid large modules:
  - Prefer adding new modules instead of growing existing ones.
  - Target modules under 500 LoC, excluding tests.
  - If a file exceeds roughly 800 LoC, add new functionality in a new module instead of extending
    the existing file unless there is a strong documented reason not to.
  - When extracting code from a large module, move the related tests and module/type docs toward
    the new implementation so the invariants stay close to the code that owns them.
- Do not create small helper methods that are referenced only once.
- Do not add tests for values that are statically defined.
- Do not add negative tests for logic that was removed.
- Do not modify `README.md` unless you are told to do so.
- For releases, follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html) and write changelogs.

## TroubleShooting

When encountering tricky bugs, first search the following websites for 3~5 solutions to similar problems, and then come up with a fix:

- [Official Scriptable Documentation](https://docs.scriptable.app/)
- [Scriptable Forum](https://talk.automators.fm/c/scriptable/13/)
- Developer platforms, like GitHub, Stack Overflow, etc.
