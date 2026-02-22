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
    let groupId = "group.com.banditinnovations.fitlinks"
    let containerURL = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: groupId)
    NSLog("[SharedItemsModule] 📦 AppGroup containerURL: \(containerURL?.absoluteString ?? "nil") for \(groupId)")
    
    NSLog("[SharedItemsModule] 📖 Reading from UserDefaults")
    NSLog("[SharedItemsModule] Suite: \(kAppGroupIdentifier)")
    NSLog("[SharedItemsModule] Key: \(sharedKey)")
    NSLog("[SharedItemsModule] Type hint: \(sharedType ?? "nil")")
    
    guard let userDefaults = UserDefaults(suiteName: kAppGroupIdentifier) else {
      NSLog("[SharedItemsModule] ❌ App group UserDefaults unavailable")
      reject("NO_APP_GROUP", "App group UserDefaults unavailable", nil)
      return
    }
    guard let obj = userDefaults.object(forKey: sharedKey) else {
      NSLog("[SharedItemsModule] ⚠️ No payload found for key: \(sharedKey)")
      resolve(nil)
      return
    }

    NSLog("[SharedItemsModule] ✅ Payload exists")
    if let data = obj as? Data {
      NSLog("[SharedItemsModule] Payload type: Data, length: \(data.count) bytes")
      if let jsonStr = String(data: data, encoding: .utf8) {
        NSLog("[SharedItemsModule] Payload preview: \(String(jsonStr.prefix(120)))")
      }
    } else if let strings = obj as? [String] {
      NSLog("[SharedItemsModule] Payload type: [String], count: \(strings.count)")
      NSLog("[SharedItemsModule] Payload preview: \(strings.joined(separator: ", ").prefix(120))")
    } else {
      NSLog("[SharedItemsModule] Payload type: \(type(of: obj))")
    }

    let typeHint = sharedType as String?

    // Case 1: [String] (text share)
    if let strings = obj as? [String] {
      let joined = strings.joined(separator: "\n")
      resolve(["type": "text", "value": joined])
      return
    }

    // Case 2: Data (JSON - weburl or media/file)
    if let data = obj as? Data {
      guard let rawJson = String(data: data, encoding: .utf8) else {
        resolve(["type": typeHint ?? "unknown", "value": "", "raw": ""])
        return
      }
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
        completion(["type": "weburl", "value": url])
        return
      }
      if let webUrl = first["webUrl"] as? String, webUrl.hasPrefix("http") {
        completion(["type": "weburl", "value": webUrl])
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
    NSLog("[SharedItemsModule] 🗑️ Clearing payload for key: \(sharedKey)")
    guard let userDefaults = UserDefaults(suiteName: kAppGroupIdentifier) else {
      NSLog("[SharedItemsModule] ❌ App group UserDefaults unavailable")
      reject("NO_APP_GROUP", "App group UserDefaults unavailable", nil)
      return
    }
    userDefaults.removeObject(forKey: sharedKey)
    userDefaults.synchronize()
    NSLog("[SharedItemsModule] ✅ Payload cleared")
    resolve(nil)
  }

  @objc
  func readAndClearSharedPayload(
    _ sharedKey: String,
    sharedType: NSString?,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let groupId = "group.com.banditinnovations.fitlinks"
    let containerURL = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: groupId)
    NSLog("[SharedItemsModule] 📦 AppGroup containerURL: \(containerURL?.absoluteString ?? "nil") for \(groupId)")
    
    NSLog("[SharedItemsModule] 📖 Reading from UserDefaults (atomic read+clear)")
    NSLog("[SharedItemsModule] Suite: \(kAppGroupIdentifier)")
    NSLog("[SharedItemsModule] Key: \(sharedKey)")
    NSLog("[SharedItemsModule] Type hint: \(sharedType ?? "nil")")
    
    guard let userDefaults = UserDefaults(suiteName: kAppGroupIdentifier) else {
      NSLog("[SharedItemsModule] ❌ App group UserDefaults unavailable")
      reject("NO_APP_GROUP", "App group UserDefaults unavailable", nil)
      return
    }
    
    guard let obj = userDefaults.object(forKey: sharedKey) else {
      NSLog("[SharedItemsModule] ⚠️ No payload found for key: \(sharedKey)")
      NSLog("[FL_SHARE_DIAG] native readAndClear { found: false, sharedType: \(sharedType ?? "nil"), shareNonce: nil }")
      resolve(nil)
      return
    }

    var detectedShareNonce: String? = nil
    if let data = obj as? Data,
      let json = try? JSONSerialization.jsonObject(with: data, options: []) {
      if let dict = json as? [String: Any] {
        detectedShareNonce = dict["shareNonce"] as? String
      } else if let arr = json as? [[String: Any]], let first = arr.first {
        detectedShareNonce = first["shareNonce"] as? String
      }
    } else if let dict = obj as? [String: Any] {
      detectedShareNonce = dict["shareNonce"] as? String
    }
    NSLog(
      "[FL_SHARE_DIAG] native readAndClear { found: true, sharedType: \(sharedType ?? "nil"), shareNonce: \(detectedShareNonce ?? "nil") }"
    )

    NSLog("[SharedItemsModule] ✅ Payload exists")
    if let data = obj as? Data {
      NSLog("[SharedItemsModule] Payload type: Data, length: \(data.count) bytes")
      if let jsonStr = String(data: data, encoding: .utf8) {
        NSLog("[SharedItemsModule] Payload preview: \(String(jsonStr.prefix(120)))")
      }
    } else if let strings = obj as? [String] {
      NSLog("[SharedItemsModule] Payload type: [String], count: \(strings.count)")
      NSLog("[SharedItemsModule] Payload preview: \(strings.joined(separator: ", ").prefix(120))")
    } else {
      NSLog("[SharedItemsModule] Payload type: \(type(of: obj))")
    }

    // Clear immediately after reading
    userDefaults.removeObject(forKey: sharedKey)
    userDefaults.synchronize()
    NSLog("[SharedItemsModule] 🗑️ Payload cleared after read")

    let typeHint = sharedType as String?

    // Case 1: [String] (text share)
    if let strings = obj as? [String] {
      let joined = strings.joined(separator: "\n")
      resolve(["type": "text", "value": joined])
      return
    }

    // Case 2: Data (JSON - weburl or media/file)
    if let data = obj as? Data {
      guard let rawJson = String(data: data, encoding: .utf8) else {
        resolve(["type": typeHint ?? "unknown", "value": "", "raw": ""])
        return
      }
      parseJsonPayload(rawJson: rawJson, typeHint: typeHint) { result in
        resolve(result)
      }
      return
    }

    resolve(["type": typeHint ?? "unknown", "value": String(describing: obj), "raw": String(describing: obj)])
  }
}
