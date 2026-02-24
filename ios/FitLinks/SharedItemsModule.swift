import Foundation
import React

private let kAppGroupIdentifier = "group.com.banditinnovations.fitlinks"

@objc(SharedItems)
class SharedItemsModule: NSObject {

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }

  @objc
  func getSharedPayload(
    _ sharedKey: String,
    sharedType: NSString?,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard let userDefaults = UserDefaults(suiteName: kAppGroupIdentifier) else {
      NSLog("[SharedItemsModule] ❌ App group UserDefaults unavailable")
      reject("NO_APP_GROUP", "App group UserDefaults unavailable", nil)
      return
    }

    // Log debug info written by the share extension (attachment types, code version)
    let debugTypes = userDefaults.string(forKey: "\(sharedKey)_debug") ?? "nil"
    let debugVersion = userDefaults.string(forKey: "\(sharedKey)_version") ?? "nil"
    NSLog("[SharedItemsModule] 🔍 Share extension version: \(debugVersion)")
    NSLog("[SharedItemsModule] 🔍 Attachment types: \(debugTypes)")

    guard let obj = userDefaults.object(forKey: sharedKey) else {
      NSLog("[SharedItemsModule] ⚠️ No payload found for key: \(sharedKey)")
      resolve(nil)
      return
    }

    let typeHint = sharedType as String?

    // Case 1: [String] (text share)
    if let strings = obj as? [String] {
      let joined = strings.joined(separator: "\n")
      NSLog("[SharedItemsModule] Payload type: [String], value: \(joined.prefix(120))")

      // Fallback: if the text doesn't look like a URL, check the secondary
      // URL key. Chrome shares a URL attachment AND a promotional text
      // attachment. The text handler may save "Download Chrome here." while
      // the URL handler saved the real URL to a secondary key.
      let hasUrl = joined.hasPrefix("http://") || joined.hasPrefix("https://")
      if !hasUrl, let fallbackUrl = userDefaults.string(forKey: "\(sharedKey)_url"),
         fallbackUrl.hasPrefix("http") {
        NSLog("[SharedItemsModule] 🔄 Falling back to secondary URL key: \(fallbackUrl.prefix(120))")
        resolve(["type": "weburl", "value": fallbackUrl])
        return
      }

      resolve(["type": "text", "value": joined])
      return
    }

    // Case 2: Data (JSON - weburl or media/file)
    if let data = obj as? Data {
      guard let rawJson = String(data: data, encoding: .utf8) else {
        resolve(["type": typeHint ?? "unknown", "value": "", "raw": ""])
        return
      }
      NSLog("[SharedItemsModule] Payload type: Data, preview: \(rawJson.prefix(120))")
      parseJsonPayload(rawJson: rawJson, typeHint: typeHint) { result in
        resolve(result)
      }
      return
    }

    resolve(["type": typeHint ?? "unknown", "value": String(describing: obj), "raw": String(describing: obj)])
  }

  private func parseJsonPayload(
    rawJson: String,
    typeHint: String?,
    completion: @escaping ([String: Any]) -> Void
  ) {
    guard let jsonData = rawJson.data(using: .utf8),
          let json = try? JSONSerialization.jsonObject(with: jsonData) else {
      completion(["type": typeHint ?? "unknown", "value": rawJson, "raw": rawJson])
      return
    }

    // JSON is a single string URL
    if let urlString = json as? String, urlString.hasPrefix("http") {
      completion(["type": "weburl", "value": urlString])
      return
    }

    // JSON is an array of objects
    if let arr = json as? [[String: Any]], let first = arr.first {
      if let url = first["url"] as? String, url.hasPrefix("http") {
        var result: [String: Any] = ["type": "weburl", "value": url]
        if let meta = first["meta"] as? String, !meta.isEmpty {
          result["meta"] = meta
          NSLog("[SharedItemsModule] Including meta from preprocessor (\(meta.prefix(80))...)")
        }
        completion(result)
        return
      }
      if let webUrl = first["webUrl"] as? String, webUrl.hasPrefix("http") {
        var result: [String: Any] = ["type": "weburl", "value": webUrl]
        if let meta = first["meta"] as? String, !meta.isEmpty {
          result["meta"] = meta
        }
        completion(result)
        return
      }
      if let path = first["path"] as? String, path.hasPrefix("file://") {
        completion(["type": "file", "value": path])
        return
      }
    }

    completion(["type": typeHint ?? "unknown", "value": rawJson, "raw": rawJson])
  }

  @objc
  func clearSharedPayload(
    _ sharedKey: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard let userDefaults = UserDefaults(suiteName: kAppGroupIdentifier) else {
      reject("NO_APP_GROUP", "App group UserDefaults unavailable", nil)
      return
    }
    userDefaults.removeObject(forKey: sharedKey)
    userDefaults.removeObject(forKey: "\(sharedKey)_url")
    userDefaults.removeObject(forKey: "\(sharedKey)_debug")
    userDefaults.removeObject(forKey: "\(sharedKey)_version")
    userDefaults.synchronize()
    resolve(nil)
  }
}
