# Update the existing iCloud test widget

From this checkout on a Mac with iCloud Drive and Scriptable enabled:

```sh
pnpm upload:icloud --probe  # Temporary write/read/delete test; does not update the widget
pnpm upload:icloud --check  # Fresh build and merged-source validation; does not write to iCloud
pnpm upload:icloud          # Fresh build, backup, then update the installed test widget
```

Use the repository's pinned Node/pnpm versions and install its dependencies first. The macOS Swift toolchain (`/usr/bin/swift`, supplied with Xcode Command Line Tools) is also required. The first invocation may take longer while Swift populates its module cache. Terminal/Codex must have permission to access iCloud Drive. A sandbox denial is not evidence that iCloud itself is unavailable.

The destination is always:

```text
~/Library/Mobile Documents/iCloud~dk~simonbs~Scriptable/Documents/WeatherCal-Test.js
```

The installed file must already exist and be a downloaded, recognizable WeatherCal-Reborn standalone script. If it is not locally available, open it in Finder/Scriptable and allow iCloud to download it before retrying. The command refuses legacy dual-file installations and will not create or rename a script. Ordinary `pnpm build` and `pnpm check` never upload anything.

## What the update preserves

The uploader rebuilds `dist/one.js` from this checkout. It uses the same `mergeScriptUpdate` implementation as the in-app updater: the installed Scriptable metadata, layout, and custom code remain byte-for-byte; only the generated engine is replaced. Edits to `src/user.ts` therefore do not reset an already installed widget's layout. Edit the installed user section deliberately if you want to change that layout. The merged file can have a different hash from `dist/one.js`, which is expected.

The script keeps its name and path. The native writer uses Foundation `NSFileCoordinator` and writes to the existing file without deleting or renaming it. It checks the expected old contents again inside the coordinated write and rejects a concurrent change. Missing files, symlinks, hard links, unresolved/unknown iCloud conflict state, invalid source, and failed backups abort before the target write.

The uploader does not access the Scriptable Library directory, preferences, background images, caches, or Keychain. In the inspected installed and current engines, preferences and appearance still use `weather-cal-preferences-WeatherCal-Test` and `weather-cal-WeatherCal-Test`; background images still use `Weather Cal/WeatherCal-Test.jpg` and `Weather Cal/WeatherCal-Test (Dark).jpg`. Retaining `Script.name()` preserves these lookups. Updating the engine can change its behavior; the upload mechanism cannot guarantee that all future engine versions are data-compatible.

## Backups and failures

Before a changed script is written, its exact old bytes are saved under `.icloud-backups/` in this checkout. That directory is Git-ignored, permission 0700; backups are permission 0600 and are never uploaded automatically. Keep these backups if you archive or delete the checkout. They may contain private custom code.

The writer verifies exact readback. On a detected write/readback failure it attempts to restore the original bytes and reports whether restoration succeeded. The existing file identity is retained, so writing is not an atomic rename: termination, power loss, disk errors, or a program ignoring file coordination can still interrupt it. A durable backup is created before the first mutation. If recovery is needed, open the backup, copy its complete contents into the **existing** WeatherCal-Test script in Scriptable, and save without changing the script name. Do not delete/recreate the Home Screen widget or reset Scriptable storage.

## What is and is not validated

The command validates ECMAScript syntax, supported Scriptable references, region boundaries and merged binding compatibility. Automated tests execute a merged standalone bundle with Scriptable mocks under the WeatherCal-Test identity and saved preferences, both background appearances, and credentials. macOS native tests verify the actual coordinated write, backup, inode preservation, neighboring-file preservation and refusal paths using temporary files.

These checks do not run JavaScriptCore or WidgetKit on an iPhone. Local success means the exact candidate was written into the Mac's iCloud-backed file. iCloud delivery and iOS refresh are asynchronous. Avoid editing the same script simultaneously on another device; coordination does not lock an offline iPhone.

After your first upload:

1. Allow iCloud to sync; open Scriptable on the iPhone and confirm WeatherCal-Test has the updated code.
2. Run that existing script and check its preview, layout, weather provider and saved background.
3. Check the existing Home Screen widget after iOS refreshes it. Keep its selected script and widget parameter unchanged.
4. If it fails, retain the backup and restore the previous contents as described above.

## Evidence from the development Mac (2026-10-26)

The real Scriptable iCloud folder was readable. A temporary coordinated write/read/delete probe succeeded with scoped filesystem access. Foundation reported the existing WeatherCal-Test.js as an iCloud item, fully uploaded and without unresolved conflicts. A fresh engine merged with the installed script passed validation while retaining metadata and editable user code. No engine deployment or iPhone runtime check was performed as part of implementation.

## Primary references

- [Scriptable FileManager](https://docs.scriptable.app/filemanager/): script Documents storage versus persistent Library storage and iCloud downloading.
- [Scriptable Script](https://docs.scriptable.app/script/): script name and widget output.
- [Scriptable Keychain](https://docs.scriptable.app/keychain/): credentials are stored separately from script source.
- [Apple: Designing for Documents in iCloud](https://developer.apple.com/library/archive/documentation/General/Conceptual/iCloudDesignGuide/Chapters/DesigningForDocumentsIniCloud.html): coordinated document access and asynchronous synchronization.

Preserving the script selection and its storage lookup is an inference from these APIs and this project's implementation, not a documented guarantee from Scriptable about every widget or script update.
