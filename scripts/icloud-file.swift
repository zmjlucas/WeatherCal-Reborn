// macOS document access for upload-icloud.mjs. No Scriptable data is modified.
import Foundation
import Darwin

enum UploadError: LocalizedError {
    case refused(String)
    var errorDescription: String? {
        switch self { case .refused(let message): return message }
    }
}

let fm = FileManager.default

func inspect(_ url: URL, allowMissing: Bool = false) throws -> [String: Any] {
    let attributes: [FileAttributeKey: Any]
    do {
        attributes = try fm.attributesOfItem(atPath: url.path)
    } catch {
        let failure = error as NSError
        guard allowMissing, failure.domain == NSCocoaErrorDomain,
              [NSFileNoSuchFileError, NSFileReadNoSuchFileError].contains(failure.code) else { throw error }
        let parent = try url.deletingLastPathComponent().resourceValues(forKeys: [.isDirectoryKey, .isUbiquitousItemKey])
        guard parent.isDirectory == true else { throw UploadError.refused("Scriptable directory does not exist.") }
        return ["exists": false, "source": NSNull(), "ubiquitous": parent.isUbiquitousItem ?? false]
    }
    guard attributes[.type] as? FileAttributeType == .typeRegular,
          (attributes[.referenceCount] as? NSNumber)?.intValue == 1 else {
        throw UploadError.refused("Target must be an existing regular file, not a symbolic or hard link.")
    }
    let values = try url.resourceValues(forKeys: [.isUbiquitousItemKey, .ubiquitousItemIsUploadedKey,
        .ubiquitousItemHasUnresolvedConflictsKey, .ubiquitousItemUploadingErrorKey])
    if values.isUbiquitousItem == true && values.ubiquitousItemHasUnresolvedConflicts != false {
        throw UploadError.refused("iCloud conflict state is unresolved or unavailable; open the document in Files before retrying.")
    }
    if let error = values.ubiquitousItemUploadingError { throw error }
    return ["exists": true, "ubiquitous": values.isUbiquitousItem ?? false,
            "uploaded": values.ubiquitousItemIsUploaded as Any? ?? NSNull()]
}

func writeBytes(_ data: Data, to handle: FileHandle) throws {
    try handle.seek(toOffset: 0)
    try handle.write(contentsOf: data)
    try handle.truncate(atOffset: UInt64(data.count))
    try handle.synchronize()
}

func privateCopy(_ data: Data, to url: URL) throws {
    let descriptor = open(url.path, O_WRONLY | O_CREAT | O_EXCL | O_NOFOLLOW, S_IRUSR | S_IWUSR)
    guard descriptor >= 0 else { throw POSIXError(POSIXErrorCode(rawValue: errno) ?? .EIO) }
    let handle = FileHandle(fileDescriptor: descriptor, closeOnDealloc: true)
    defer { try? handle.close() }
    do {
        try writeBytes(data, to: handle)
        guard try Data(contentsOf: url) == data else { throw UploadError.refused("New file readback failed.") }
    } catch {
        // Remove only our incomplete file, never a replacement from another writer.
        var opened = stat(), current = stat()
        if fstat(descriptor, &opened) == 0, lstat(url.path, &current) == 0,
           opened.st_dev == current.st_dev, opened.st_ino == current.st_ino {
            do { try fm.removeItem(at: url) }
            catch { throw UploadError.refused("Write failed and incomplete file could not be removed: \(url.path). \(error.localizedDescription)") }
        }
        throw error
    }
}

let arguments = Array(CommandLine.arguments.dropFirst())
var coordinationError: NSError?
var operationError: Error?
var result: [String: Any] = [:]

do {
    guard let command = arguments.first, arguments.count >= 2 else {
        throw UploadError.refused("Expected inspect TARGET, probe DIRECTORY, create TARGET CANDIDATE, or update TARGET EXPECTED CANDIDATE BACKUP.")
    }
    let target = URL(fileURLWithPath: arguments[1])
    if command == "inspect", arguments.count == 2 {
        result = try inspect(target, allowMissing: true)
        if result["exists"] as? Bool == true {
            NSFileCoordinator().coordinate(readingItemAt: target, options: [], error: &coordinationError) { url in
                do {
                    result = try inspect(url)
                    let data = try Data(contentsOf: url)
                    guard let source = String(data: data, encoding: .utf8) else {
                        throw UploadError.refused("Installed script is not UTF-8.")
                    }
                    result["source"] = source
                } catch { operationError = error }
            }
        }
    } else if command == "probe", arguments.count == 2 {
        var isDirectory: ObjCBool = false
        guard fm.fileExists(atPath: target.path, isDirectory: &isDirectory), isDirectory.boolValue else {
            throw UploadError.refused("The existing Scriptable iCloud directory was not found.")
        }
        let probe = target.appendingPathComponent(".weathercal-probe-\(UUID().uuidString).tmp")
        NSFileCoordinator().coordinate(writingItemAt: probe, options: [], error: &coordinationError) { url in
            do {
                try privateCopy(Data("WeatherCal access probe\n".utf8), to: url)
                try fm.removeItem(at: url)
                result = ["status": "probe-passed"]
            } catch {
                operationError = error
                // The UUID path belongs only to this invocation.
                if fm.fileExists(atPath: url.path) { try? fm.removeItem(at: url) }
            }
        }
    } else if command == "create", arguments.count == 3 {
        let candidate = try Data(contentsOf: URL(fileURLWithPath: arguments[2]))
        guard !candidate.isEmpty else { throw UploadError.refused("Refusing an empty script.") }
        NSFileCoordinator().coordinate(writingItemAt: target, options: [], error: &coordinationError) { url in
            do {
                // O_EXCL refuses any file that arrived after the initial inspection.
                try privateCopy(candidate, to: url)
                result = ["status": "created", "uploaded": NSNull()]
            } catch { operationError = error }
        }
    } else if command == "update", arguments.count == 5 {
        _ = try inspect(target)
        let expected = try Data(contentsOf: URL(fileURLWithPath: arguments[2]))
        let candidate = try Data(contentsOf: URL(fileURLWithPath: arguments[3]))
        let backup = URL(fileURLWithPath: arguments[4])
        guard !candidate.isEmpty else { throw UploadError.refused("Refusing an empty replacement.") }
        NSFileCoordinator().coordinate(writingItemAt: target, options: [], error: &coordinationError) { url in
            do {
                result = try inspect(url)
                let original = try Data(contentsOf: url)
                guard original == expected else {
                    throw UploadError.refused("Installed script changed after preparation; rerun the command to merge the latest edits.")
                }
                if original == candidate { result["status"] = "unchanged"; return }
                try privateCopy(original, to: backup)
                let descriptor = open(url.path, O_RDWR | O_NOFOLLOW)
                guard descriptor >= 0 else { throw POSIXError(POSIXErrorCode(rawValue: errno) ?? .EIO) }
                let handle = FileHandle(fileDescriptor: descriptor, closeOnDealloc: true)
                defer { try? handle.close() }
                // Recheck the opened file before its first mutation.
                guard try handle.readToEnd() == original else {
                    throw UploadError.refused("Installed script changed while opening it; no write performed.")
                }
                do {
                    try writeBytes(candidate, to: handle)
                    guard try Data(contentsOf: url) == candidate else {
                        throw UploadError.refused("Updated script failed readback.")
                    }
                } catch {
                    let failure = error
                    do {
                        try writeBytes(original, to: handle)
                        guard try Data(contentsOf: url) == original else {
                            throw UploadError.refused("Restoration readback failed.")
                        }
                    } catch {
                        throw UploadError.refused("Write failed (\(failure.localizedDescription)); restoration also failed (\(error.localizedDescription)). Restore the saved backup: \(backup.path)")
                    }
                    throw UploadError.refused("Write failed; original bytes restored. \(failure.localizedDescription)")
                }
                // A successful local write is not a claim about iCloud delivery.
                result = ["status": "updated", "backup": backup.path, "uploaded": NSNull()]
            } catch { operationError = error }
        }
    } else { throw UploadError.refused("Invalid native command or argument count.") }
    if let error = coordinationError { throw error }
    if let error = operationError { throw error }
    let output = try JSONSerialization.data(withJSONObject: result, options: [.sortedKeys])
    FileHandle.standardOutput.write(output)
    FileHandle.standardOutput.write(Data("\n".utf8))
} catch {
    FileHandle.standardError.write(Data("\(error.localizedDescription)\n".utf8))
    exit(1)
}
