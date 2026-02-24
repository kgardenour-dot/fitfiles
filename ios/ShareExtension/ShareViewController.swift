/*!
 * Native module created for Expo Share Intent (https://github.com/achorein/expo-share-intent)
 * author: achorein (https://github.com/achorein)
 * inspired by :
 *  - https://ajith-ab.github.io/react-native-receive-sharing-intent/docs/ios#create-share-extension
 */
import MobileCoreServices
import Photos
import Social
import UIKit

class ShareViewController: UIViewController {
  let hostAppGroupIdentifier = "group.com.banditinnovations.fitlinks"
  let shareProtocol = "fitlinks"
  let sharedKey = "fitlinksShareKey"
  var sharedMedia: [SharedMediaFile] = []
  var sharedWebUrl: [WebUrl] = []
  var sharedText: [String] = []
  let imageContentType: String = UTType.image.identifier
  let videoContentType: String = UTType.movie.identifier
  let textContentType: String = UTType.text.identifier
  let urlContentType: String = UTType.url.identifier
  let propertyListType: String = UTType.propertyList.identifier
  let fileURLType: String = UTType.fileURL.identifier
  let pkpassContentType: String = "com.apple.pkpass"
  let pdfContentType: String = UTType.pdf.identifier
  let vcardContentType: String = "public.vcard"

  override func viewDidLoad() {
    super.viewDidLoad()
  }

  override func viewDidAppear(_ animated: Bool) {
    super.viewDidAppear(animated)
    Task {
      guard let extensionContext = self.extensionContext,
        let content = extensionContext.inputItems.first as? NSExtensionItem,
        let attachments = content.attachments
      else {
        dismissWithError(message: "No content found")
        return
      }
      NSLog("[ShareViewController] 📋 Attachment count: \(attachments.count)")
      for (index, attachment) in (attachments).enumerated() {
        NSLog("[ShareViewController] Attachment[\(index)] types: \(attachment.registeredTypeIdentifiers)")
        if attachment.hasItemConformingToTypeIdentifier(imageContentType) {
          await handleImages(content: content, attachment: attachment, index: index)
        } else if attachment.hasItemConformingToTypeIdentifier(videoContentType) {
          await handleVideos(content: content, attachment: attachment, index: index)
        } else if attachment.hasItemConformingToTypeIdentifier(vcardContentType) {
          await handleVCard(content: content, attachment: attachment, index: index) 
        } else if attachment.hasItemConformingToTypeIdentifier(fileURLType) {
          await handleFiles(content: content, attachment: attachment, index: index)
        } else if attachment.hasItemConformingToTypeIdentifier(pkpassContentType) {
          await handlePkPass(content: content, attachment: attachment, index: index)
        } else if attachment.hasItemConformingToTypeIdentifier(pdfContentType) {
          await handlePdf(content: content, attachment: attachment, index: index)
        } else if attachment.hasItemConformingToTypeIdentifier(propertyListType) {
          await handlePrepocessing(content: content, attachment: attachment, index: index)
        } else if attachment.hasItemConformingToTypeIdentifier(urlContentType) {
          await handleUrl(content: content, attachment: attachment, index: index)
        } else if attachment.hasItemConformingToTypeIdentifier(textContentType) {
          await handleText(content: content, attachment: attachment, index: index)
        } else {
          NSLog("[ERROR] content type not handle !\(String(describing: content))")
          dismissWithError(message: "content type not handle \(String(describing: content)))")
        }
      }
    }
  }

  private func handleVCard(content: NSExtensionItem, attachment: NSItemProvider, index: Int) async {
    Task.detached {
      do {
        if let url = try? await attachment.loadItem(forTypeIdentifier: self.vcardContentType) as? URL {
          // ensure a .vcf file extension so mime resolves properly
          let tmp = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString + ".vcf")
          _ = self.copyFile(at: url, to: tmp)
          Task { @MainActor in
            await self.handleFileURL(content: content, url: tmp, index: index)
          }
        } else if let data = try? await attachment.loadItem(forTypeIdentifier: self.vcardContentType) as? Data {
          let tmp = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString + ".vcf")
          try data.write(to: tmp)
          Task { @MainActor in
            await self.handleFileURL(content: content, url: tmp, index: index)
          }
        } else {
          NSLog("[ERROR] Cannot load vcard content !\(String(describing: content))")
          await self.dismissWithError(message: "Cannot load vCard content \(String(describing: content))")
        }
      } catch {
        NSLog("[ERROR] handleVCard exception: \(error.localizedDescription)")
        await self.dismissWithError(message: "vCard error: \(error.localizedDescription)")
      }
    }
  }

  private func handleText(content: NSExtensionItem, attachment: NSItemProvider, index: Int) async {
    Task.detached {
      if let item = try? await attachment.loadItem(forTypeIdentifier: self.textContentType)
        as? String
      {
        Task { @MainActor in

          // If the text is a URL (common with Chrome which shares URLs as plain text),
          // handle it as a URL share so metadata gets fetched and type is correct.
          let trimmed = item.trimmingCharacters(in: .whitespacesAndNewlines)
          if let url = URL(string: trimmed), let scheme = url.scheme?.lowercased(),
             (scheme == "http" || scheme == "https") {
            NSLog("[ShareViewController] Text is a URL, handling as URL share: \(trimmed)")
            var meta = ""
            meta = await self.fetchPageMeta(url: url) ?? ""
            self.sharedWebUrl.append(WebUrl(url: trimmed, meta: meta))
            if index == (content.attachments?.count)! - 1 {
              let userDefaults = UserDefaults(suiteName: self.hostAppGroupIdentifier)
              let data = self.toData(data: self.sharedWebUrl)
              userDefaults?.set(data, forKey: self.sharedKey)
              userDefaults?.synchronize()
              NSLog("[ShareViewController] ✅ Writing URL (from text) to UserDefaults")
              self.redirectToHostApp(type: .weburl)
            }
            return
          }

          self.sharedText.append(item)
          // If this is the last item, save sharedText in userDefaults and redirect to host app
          if index == (content.attachments?.count)! - 1 {
            let userDefaults = UserDefaults(suiteName: self.hostAppGroupIdentifier)
            userDefaults?.set(self.sharedText, forKey: self.sharedKey)
            userDefaults?.synchronize()
            NSLog("[ShareViewController] ✅ Writing TEXT to UserDefaults")
            self.redirectToHostApp(type: .text)
          }

        }
      } else {
        NSLog("[ERROR] Cannot load text content !\(String(describing: content))")
        await self.dismissWithError(
          message: "Cannot load text content \(String(describing: content))")
      }
    }
  }

  private func handleUrl(content: NSExtensionItem, attachment: NSItemProvider, index: Int) async {
    Task.detached {
      if let item = try? await attachment.loadItem(forTypeIdentifier: self.urlContentType) as? URL {
        let urlString = item.absoluteString
        NSLog("[ShareViewController] handleUrl: received \(urlString)")

        // Fetch page metadata server-side (needed for non-Safari browsers like Chrome
        // that don't support NSExtensionJavaScriptPreprocessingFile)
        var meta = ""
        if urlString.hasPrefix("http") {
          NSLog("[ShareViewController] handleUrl: fetching page metadata for \(urlString)")
          meta = await self.fetchPageMeta(url: item) ?? ""
          NSLog("[ShareViewController] handleUrl: fetched meta length=\(meta.count)")
        }

        Task { @MainActor in

          self.sharedWebUrl.append(WebUrl(url: urlString, meta: meta))
          // If this is the last item, save sharedText in userDefaults and redirect to host app
          if index == (content.attachments?.count)! - 1 {
            let groupId = "group.com.banditinnovations.fitlinks"
            let containerURL = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: groupId)
            NSLog("[ShareViewController] 📦 AppGroup containerURL: \(containerURL?.absoluteString ?? "nil") for \(groupId)")

            let userDefaults = UserDefaults(suiteName: self.hostAppGroupIdentifier)
            let data = self.toData(data: self.sharedWebUrl)
            userDefaults?.set(data, forKey: self.sharedKey)
            userDefaults?.synchronize()
            NSLog("[ShareViewController] ✅ Writing URL to UserDefaults")
            NSLog("[ShareViewController] Suite: \(self.hostAppGroupIdentifier)")
            NSLog("[ShareViewController] Key: \(self.sharedKey)")
            NSLog("[ShareViewController] URL: \(urlString)")
            NSLog("[ShareViewController] Meta: \(meta.prefix(120))")
            if let data = data {
              NSLog("[ShareViewController] Payload length: \(data.count) bytes")
              if let jsonStr = String(data: data, encoding: .utf8) {
                NSLog("[ShareViewController] Payload preview: \(String(jsonStr.prefix(200)))")
              }
            }
            self.redirectToHostApp(type: .weburl)
          }

        }
      } else {
        NSLog("[ERROR] Cannot load url content !\(String(describing: content))")
        await self.dismissWithError(
          message: "Cannot load url content \(String(describing: content))")
      }
    }
  }

  /// Fetch page title and meta tags via HTTP for URLs shared without JS preprocessing (e.g. Chrome).
  /// Returns a JSON string matching the same format as ShareExtensionPreprocessor.js output.
  private func fetchPageMeta(url: URL) async -> String? {
    do {
      var request = URLRequest(url: url, timeoutInterval: 5)
      request.httpMethod = "GET"
      request.setValue(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        forHTTPHeaderField: "User-Agent"
      )
      request.setValue("text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        forHTTPHeaderField: "Accept"
      )

      let (data, response) = try await URLSession.shared.data(for: request)

      // Only parse HTML responses
      if let httpResponse = response as? HTTPURLResponse {
        let contentType = httpResponse.value(forHTTPHeaderField: "Content-Type") ?? ""
        guard contentType.contains("text/html") || contentType.contains("application/xhtml") else {
          NSLog("[ShareExtension] fetchPageMeta: non-HTML content type: \(contentType)")
          return nil
        }
      }

      // Limit parsing to first 50KB to stay within share extension memory limits
      let limit = min(data.count, 50_000)
      let html = String(data: data[0..<limit], encoding: .utf8)
        ?? String(data: data[0..<limit], encoding: .ascii)
        ?? ""

      if html.isEmpty { return nil }

      var metas: [String: String] = [:]

      // Extract <title>
      if let titleRegex = try? NSRegularExpression(pattern: "<title[^>]*>([^<]*)</title>", options: .caseInsensitive),
         let match = titleRegex.firstMatch(in: html, range: NSRange(html.startIndex..., in: html)),
         let range = Range(match.range(at: 1), in: html) {
        let title = String(html[range]).trimmingCharacters(in: .whitespacesAndNewlines)
        if !title.isEmpty {
          metas["title"] = title
        }
      }

      // Extract <meta> tags with name/property and content attributes
      // Pattern 1: name/property before content
      let pattern1 = "<meta\\s+[^>]*(?:name|property)=[\"']([^\"']+)[\"'][^>]*content=[\"']([^\"']*)[\"'][^>]*/?>|"
      // Pattern 2: content before name/property
      let pattern2 = "<meta\\s+[^>]*content=[\"']([^\"']*)[\"'][^>]*(?:name|property)=[\"']([^\"']+)[\"'][^>]*/?>"
      let metaRegex = try NSRegularExpression(pattern: pattern1 + pattern2, options: .caseInsensitive)
      let matches = metaRegex.matches(in: html, range: NSRange(html.startIndex..., in: html))

      for match in matches {
        var name: String?
        var content: String?

        if match.range(at: 1).location != NSNotFound, match.range(at: 2).location != NSNotFound,
           let r1 = Range(match.range(at: 1), in: html), let r2 = Range(match.range(at: 2), in: html) {
          name = String(html[r1])
          content = String(html[r2])
        } else if match.range(at: 3).location != NSNotFound, match.range(at: 4).location != NSNotFound,
                  let r3 = Range(match.range(at: 3), in: html), let r4 = Range(match.range(at: 4), in: html) {
          content = String(html[r3])
          name = String(html[r4])
        }

        if let name = name, let content = content, !content.isEmpty {
          metas[name] = content
        }
      }

      if metas.isEmpty { return nil }

      let jsonData = try JSONSerialization.data(withJSONObject: metas)
      return String(data: jsonData, encoding: .utf8)
    } catch {
      NSLog("[ShareExtension] fetchPageMeta error: \(error.localizedDescription)")
      return nil
    }
  }

  private func handlePrepocessing(content: NSExtensionItem, attachment: NSItemProvider, index: Int)
    async
  {
    Task.detached {
      if let item = try? await attachment.loadItem(
        forTypeIdentifier: self.propertyListType, options: nil)
        as? NSDictionary
      {
        Task { @MainActor in

          if let results = item[NSExtensionJavaScriptPreprocessingResultsKey]
            as? NSDictionary
          {
            NSLog(
              "[DEBUG] NSExtensionJavaScriptPreprocessingResultsKey \(String(describing: results))"
            )
            let baseURI = results["baseURI"] as? String ?? ""
            let meta = results["meta"] as? String ?? ""
            self.sharedWebUrl.append(
              WebUrl(url: baseURI, meta: meta))
            // If this is the last item, save sharedText in userDefaults and redirect to host app
            if index == (content.attachments?.count)! - 1 {
              let groupId = "group.com.banditinnovations.fitlinks"
              let containerURL = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: groupId)
              NSLog("[ShareViewController] 📦 AppGroup containerURL: \(containerURL?.absoluteString ?? "nil") for \(groupId)")
              
              let userDefaults = UserDefaults(suiteName: self.hostAppGroupIdentifier)
              let data = self.toData(data: self.sharedWebUrl)
              userDefaults?.set(data, forKey: self.sharedKey)
              userDefaults?.synchronize()
              NSLog("[ShareViewController] ✅ Writing WEBURL (preprocessing) to UserDefaults")
              NSLog("[ShareViewController] Suite: \(self.hostAppGroupIdentifier)")
              NSLog("[ShareViewController] Key: \(self.sharedKey)")
              NSLog("[ShareViewController] URL: \(baseURI)")
              NSLog("[ShareViewController] Meta: \(meta)")
              if let data = data {
                NSLog("[ShareViewController] Payload length: \(data.count) bytes")
                if let jsonStr = String(data: data, encoding: .utf8) {
                  NSLog("[ShareViewController] Payload preview: \(String(jsonStr.prefix(120)))")
                }
              }
              self.redirectToHostApp(type: .weburl)
            }
          } else {
            // No JS preprocessing results — this happens for non-Safari browsers (Chrome, etc.)
            // that match propertyListType but don't run the JS preprocessor.
            // Fall back to extracting the URL from the attachment directly.
            NSLog("[ShareViewController] ⚠️ No JS preprocessing results — falling back to URL extraction")
            if attachment.hasItemConformingToTypeIdentifier(self.urlContentType) {
              NSLog("[ShareViewController] Attachment also has URL type — loading URL")
              if let urlItem = try? await attachment.loadItem(forTypeIdentifier: self.urlContentType) as? URL {
                let urlString = urlItem.absoluteString
                NSLog("[ShareViewController] Fallback URL: \(urlString)")
                var meta = ""
                if urlString.hasPrefix("http") {
                  meta = await self.fetchPageMeta(url: urlItem) ?? ""
                }
                self.sharedWebUrl.append(WebUrl(url: urlString, meta: meta))
                if index == (content.attachments?.count)! - 1 {
                  let userDefaults = UserDefaults(suiteName: self.hostAppGroupIdentifier)
                  let data = self.toData(data: self.sharedWebUrl)
                  userDefaults?.set(data, forKey: self.sharedKey)
                  userDefaults?.synchronize()
                  NSLog("[ShareViewController] ✅ Writing WEBURL (fallback) to UserDefaults")
                  self.redirectToHostApp(type: .weburl)
                }
              } else {
                NSLog("[ERROR] Fallback URL load failed")
                self.dismissWithError(message: "Cannot load URL from attachment")
              }
            } else {
              NSLog("[ERROR] No URL type available for fallback")
              self.dismissWithError(
                message: "Cannot load preprocessing results \(String(describing: content))")
            }
          }

        }
      } else {
        NSLog("[ERROR] Cannot load preprocessing content !\(String(describing: content))")
        await self.dismissWithError(
          message: "Cannot load preprocessing content \(String(describing: content))")
      }
    }
  }

  private func handlePkPass(content: NSExtensionItem, attachment: NSItemProvider, index: Int) async {
      Task.detached {
          NSLog("[DEBUG] Attempting to handle pkpass file for item \(index)")
          NSLog("[DEBUG] Available type identifiers: \(attachment.registeredTypeIdentifiers)")
  
          do {
              if let url = try await attachment.loadItem(forTypeIdentifier: self.pkpassContentType) as? URL {
                  NSLog("[DEBUG] Successfully loaded pkpass as URL: \(url.absoluteString)")
                  NSLog("[DEBUG] URL path: \(url.path), isFileURL: \(url.isFileURL)")
                  await self.handleFileURL(content: content, url: url, index: index)
  
              } else if let data = try await attachment.loadItem(forTypeIdentifier: self.pkpassContentType) as? Data {
                  NSLog("[DEBUG] Successfully loaded pkpass as Data, size: \(data.count) bytes")
                  let tempFileName = UUID().uuidString + ".pkpass"
                  let tempFileURL = FileManager.default.temporaryDirectory.appendingPathComponent(tempFileName)
  
                  // Writing data to a file is I/O, keep it off the main thread.
                  try data.write(to: tempFileURL)
                  NSLog("[DEBUG] Saved pkpass data to temporary file: \(tempFileURL.path)")
  
                  // Handle the newly created temporary file URL.
                  await self.handleFileURL(content: content, url: tempFileURL, index: index)
  
              } else {
                  // If it's neither URL nor Data, it's unexpected for pkpassContentType.
                  NSLog("[ERROR] Cannot load pkpass content: Item was neither URL nor Data for type \(self.pkpassContentType). Attachment: \(attachment)")
                  // Ensure dismissWithError runs on the main thread if it interacts with UI
                  Task { @MainActor in
                      self.dismissWithError(message: "Cannot load pkpass content (unexpected data type).")
                  }
              }
          } catch {
              // Catch errors from loadItem or data.write
              NSLog("[ERROR] Exception when handling pkpass: \(error.localizedDescription)")
              // Ensure dismissWithError runs on the main thread if it interacts with UI
              Task { @MainActor in
                  self.dismissWithError(message: "Error processing pkpass: \(error.localizedDescription)")
              }
          }
      }
  }


  private func handleImages(content: NSExtensionItem, attachment: NSItemProvider, index: Int) async {
    Task.detached {
      do {
        let item = try await attachment.loadItem(forTypeIdentifier: self.imageContentType)
        
        Task { @MainActor in
          var url: URL? = nil
          
          if let dataURL = item as? URL {
            url = dataURL
          } else if let imageData = item as? UIImage {
            url = self.saveScreenshot(imageData)
            if url == nil {
              NSLog("[ERROR] handleImages: saveScreenshot returned nil")
            }
          } else if let data = item as? Data {
            if let image = UIImage(data: data) {
              url = self.saveScreenshot(image)
            } else {
              NSLog("[ERROR] handleImages: Failed to create UIImage from Data")
            }
          } else {
            NSLog("[ERROR] handleImages: Item is unexpected type: \(type(of: item))")
          }

          guard let safeURL = url else {
            NSLog("[ERROR] handleImages: Failed to get URL for image item")
            self.dismissWithError(message: "Failed to process image")
            return
          }

          var pixelWidth: Int? = nil
          var pixelHeight: Int? = nil
          if let imageSource = CGImageSourceCreateWithURL(safeURL as CFURL, nil) {
            if let imageProperties = CGImageSourceCopyPropertiesAtIndex(imageSource, 0, nil)
              as Dictionary?
            {
              pixelWidth = imageProperties[kCGImagePropertyPixelWidth] as? Int
              pixelHeight = imageProperties[kCGImagePropertyPixelHeight] as? Int
              // Check orientation and flip size if required
              if let orientationNumber = imageProperties[kCGImagePropertyOrientation] as! CFNumber?
              {
                var orientation: Int = 0
                CFNumberGetValue(orientationNumber, .intType, &orientation)
                if orientation > 4 {
                  let temp: Int? = pixelWidth
                  pixelWidth = pixelHeight
                  pixelHeight = temp
                }
              }
            }
          }

          // Always copy
          let fileName = self.getFileName(from: safeURL, type: .image)
          let fileExtension = self.getExtension(from: safeURL, type: .image)
          let fileSize = self.getFileSize(from: safeURL)
          let mimeType = safeURL.mimeType(ext: fileExtension)
          let newName = "\(UUID().uuidString).\(fileExtension)"
          let newPath = FileManager.default
            .containerURL(
              forSecurityApplicationGroupIdentifier: self.hostAppGroupIdentifier)!
            .appendingPathComponent(newName)
          
          let copied = self.copyFile(at: safeURL, to: newPath)
          
          if copied {
            self.sharedMedia.append(
              SharedMediaFile(
                path: newPath.absoluteString, thumbnail: nil, fileName: fileName,
                fileSize: fileSize, width: pixelWidth, height: pixelHeight, duration: nil,
                mimeType: mimeType, type: .image))
          }

          // If this is the last item, save imagesData in userDefaults and redirect to host app
          if index == (content.attachments?.count)! - 1 {
            let groupId = "group.com.banditinnovations.fitlinks"
            let containerURL = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: groupId)
            NSLog("[ShareViewController] 📦 AppGroup containerURL: \(containerURL?.absoluteString ?? "nil") for \(groupId)")
            
            let userDefaults = UserDefaults(suiteName: self.hostAppGroupIdentifier)
            let data = self.toData(data: self.sharedMedia)
            userDefaults?.set(data, forKey: self.sharedKey)
            userDefaults?.synchronize()
            NSLog("[ShareViewController] ✅ Writing IMAGE to UserDefaults")
            NSLog("[ShareViewController] Suite: \(self.hostAppGroupIdentifier)")
            NSLog("[ShareViewController] Key: \(self.sharedKey)")
            NSLog("[ShareViewController] Media count: \(self.sharedMedia.count)")
            if let data = data {
              NSLog("[ShareViewController] Payload length: \(data.count) bytes")
            }
            self.redirectToHostApp(type: .media)
          }
        }
      } catch {
        NSLog("[ERROR] handleImages: Exception loading image item: \(error)")
        await self.dismissWithError(message: "Cannot load image content: \(error.localizedDescription)")
      }
    }
  }

  private func documentDirectoryPath() -> URL? {
    let paths = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)
    
    if let firstPath = paths.first {
      _ = FileManager.default.fileExists(atPath: firstPath.path)
      return firstPath
    } else {
      return nil
    }
  }

  private func saveScreenshot(_ image: UIImage) -> URL? {
    guard let screenshotData = image.pngData() else {
      return nil
    }
    
    // Try using the app group container instead of documents directory
    guard let containerURL = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: self.hostAppGroupIdentifier) else {
      return nil
    }
    
    let fileName = "screenshot_\(UUID().uuidString).png"
    let screenshotPath = containerURL.appendingPathComponent(fileName)
    
    do {
      try screenshotData.write(to: screenshotPath)

      let fileExists = FileManager.default.fileExists(atPath: screenshotPath.path)
      
      if fileExists {
        let attributes = try? FileManager.default.attributesOfItem(atPath: screenshotPath.path)
        _ = attributes?[.size] as? Int ?? 0
      }
      
      return screenshotPath
    } catch {
      NSLog("[ERROR] saveScreenshot: Failed to write screenshot: \(error)")
      NSLog("[ERROR] saveScreenshot: Error details: \(error.localizedDescription)")
      return nil
    }
  }

  private func handleVideos(content: NSExtensionItem, attachment: NSItemProvider, index: Int) async
  {
    Task.detached {
      if let url = try? await attachment.loadItem(forTypeIdentifier: self.videoContentType) as? URL
      {
        Task { @MainActor in

          // Always copy
          let fileName = self.getFileName(from: url, type: .video)
          let fileExtension = self.getExtension(from: url, type: .video)
          let fileSize = self.getFileSize(from: url)
          let mimeType = url.mimeType(ext: fileExtension)
          let newName = "\(UUID().uuidString).\(fileExtension)"
          let newPath = FileManager.default
            .containerURL(
              forSecurityApplicationGroupIdentifier: self.hostAppGroupIdentifier)!
            .appendingPathComponent(newName)
          let copied = self.copyFile(at: url, to: newPath)
          if copied {
            guard
              let sharedFile = self.getSharedMediaFile(
                forVideo: newPath, fileName: fileName, fileSize: fileSize, mimeType: mimeType)
            else {
              return
            }
            self.sharedMedia.append(sharedFile)
          }

          // If this is the last item, save imagesData in userDefaults and redirect to host app
          if index == (content.attachments?.count)! - 1 {
            let groupId = "group.com.banditinnovations.fitlinks"
            let containerURL = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: groupId)
            NSLog("[ShareViewController] 📦 AppGroup containerURL: \(containerURL?.absoluteString ?? "nil") for \(groupId)")
            
            let userDefaults = UserDefaults(suiteName: self.hostAppGroupIdentifier)
            let data = self.toData(data: self.sharedMedia)
            userDefaults?.set(data, forKey: self.sharedKey)
            userDefaults?.synchronize()
            NSLog("[ShareViewController] ✅ Writing VIDEO to UserDefaults")
            NSLog("[ShareViewController] Suite: \(self.hostAppGroupIdentifier)")
            NSLog("[ShareViewController] Key: \(self.sharedKey)")
            NSLog("[ShareViewController] Media count: \(self.sharedMedia.count)")
            if let data = data {
              NSLog("[ShareViewController] Payload length: \(data.count) bytes")
            }
            self.redirectToHostApp(type: .media)
          }

        }
      } else {
        NSLog("[ERROR] Cannot load video content !\(String(describing: content))")
        await self.dismissWithError(
          message: "Cannot load video content \(String(describing: content))")
      }
    }
  }

  private func handlePdf(content: NSExtensionItem, attachment: NSItemProvider, index: Int) async {
    Task.detached {
      if let url = try? await attachment.loadItem(forTypeIdentifier: self.pdfContentType) as? URL {
        Task { @MainActor in

          await self.handleFileURL(content: content, url: url, index: index)

        }
      } else {
        NSLog("[ERROR] Cannot load pdf content !\(String(describing: content))")
        await self.dismissWithError(
          message: "Cannot load pdf content \(String(describing: content))")
      }
    }
  }

  private func handleFiles(content: NSExtensionItem, attachment: NSItemProvider, index: Int) async {
    Task.detached {
      if let url = try? await attachment.loadItem(forTypeIdentifier: self.fileURLType) as? URL {
        Task { @MainActor in

          await self.handleFileURL(content: content, url: url, index: index)

        }
      } else {
        NSLog("[ERROR] Cannot load file content !\(String(describing: content))")
        await self.dismissWithError(
          message: "Cannot load file content \(String(describing: content))")
      }
    }
  }

  private func handleFileURL(content: NSExtensionItem, url: URL, index: Int) async {
    // Always copy
    let fileName = self.getFileName(from: url, type: .file)
    let fileExtension = self.getExtension(from: url, type: .file)
    let fileSize = self.getFileSize(from: url)
    let mimeType = url.mimeType(ext: fileExtension)
    let newName = "\(UUID().uuidString).\(fileExtension)"
    let newPath = FileManager.default
      .containerURL(
        forSecurityApplicationGroupIdentifier: self.hostAppGroupIdentifier)!
      .appendingPathComponent(newName)
    let copied = self.copyFile(at: url, to: newPath)
    if copied {
      self.sharedMedia.append(
        SharedMediaFile(
          path: newPath.absoluteString, thumbnail: nil, fileName: fileName,
          fileSize: fileSize, width: nil, height: nil, duration: nil, mimeType: mimeType,
          type: .file))
    }

    if index == (content.attachments?.count)! - 1 {
      let groupId = "group.com.banditinnovations.fitlinks"
      let containerURL = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: groupId)
      NSLog("[ShareViewController] 📦 AppGroup containerURL: \(containerURL?.absoluteString ?? "nil") for \(groupId)")
      
      let userDefaults = UserDefaults(suiteName: self.hostAppGroupIdentifier)
      let data = self.toData(data: self.sharedMedia)
      userDefaults?.set(data, forKey: self.sharedKey)
      userDefaults?.synchronize()
      NSLog("[ShareViewController] ✅ Writing FILE to UserDefaults")
      NSLog("[ShareViewController] Suite: \(self.hostAppGroupIdentifier)")
      NSLog("[ShareViewController] Key: \(self.sharedKey)")
      NSLog("[ShareViewController] Media count: \(self.sharedMedia.count)")
      if let data = data {
        NSLog("[ShareViewController] Payload length: \(data.count) bytes")
      }
      self.redirectToHostApp(type: .file)
    }
  }

  private func dismissWithError(message: String? = nil) {
    DispatchQueue.main.async {
      NSLog("[ERROR] Error loading application ! \(message!)")
      let alert = UIAlertController(
        title: "Error", message: "Error loading application: \(message!)", preferredStyle: .alert)

      let action = UIAlertAction(title: "OK", style: .cancel) { _ in
        self.dismiss(animated: true, completion: nil)
        self.extensionContext!.completeRequest(returningItems: [], completionHandler: nil)
      }

      alert.addAction(action)
      self.present(alert, animated: true, completion: nil)
    }
  }

  private func redirectToHostApp(type: RedirectType) {
    let url = URL(string: "\(shareProtocol)://dataUrl=\(sharedKey)#\(type)")!
    var responder = self as UIResponder?

    while responder != nil {
      if let application = responder as? UIApplication {
        if application.canOpenURL(url) {
          application.open(url)
        } else {
          NSLog("redirectToHostApp canOpenURL KO: \(shareProtocol)")
          self.dismissWithError(
            message: "Application not found, invalid url scheme \(shareProtocol)")
          return
        }
      }
      responder = responder!.next
    }
    extensionContext!.completeRequest(returningItems: [], completionHandler: nil)
  }

  enum RedirectType {
    case media
    case text
    case weburl
    case file
  }

  func getExtension(from url: URL, type: SharedMediaType) -> String {
    let parts = url.lastPathComponent.components(separatedBy: ".")
    var ex: String? = nil
    if parts.count > 1 {
      ex = parts.last
    }
    if ex == nil {
      switch type {
      case .image:
        ex = "PNG"
      case .video:
        ex = "MP4"
      case .file:
        ex = "TXT"
        if url.lastPathComponent.lowercased().contains("pkpass") { ex = "pkpass" }
      }
    }
    return ex ?? "Unknown"
  }

  func getFileName(from url: URL, type: SharedMediaType) -> String {
    var name = url.lastPathComponent
    if name == "" {
      name = UUID().uuidString + "." + getExtension(from: url, type: type)
    }
    return name
  }

  func getFileSize(from url: URL) -> Int? {
    do {
      let resources = try url.resourceValues(forKeys: [.fileSizeKey])
      return resources.fileSize
    } catch {
      NSLog("Error: \(error)")
      return nil
    }
  }

  func copyFile(at srcURL: URL, to dstURL: URL) -> Bool {
    do {
      if FileManager.default.fileExists(atPath: dstURL.path) {
        try FileManager.default.removeItem(at: dstURL)
      }
      try FileManager.default.copyItem(at: srcURL, to: dstURL)
    } catch (let error) {
      NSLog("Cannot copy item at \(srcURL) to \(dstURL): \(error)")
      return false
    }
    return true
  }

  private func getSharedMediaFile(forVideo: URL, fileName: String, fileSize: Int?, mimeType: String)
    -> SharedMediaFile?
  {
    let asset = AVAsset(url: forVideo)
    let thumbnailPath = getThumbnailPath(for: forVideo)
    let duration = (CMTimeGetSeconds(asset.duration) * 1000).rounded()
    var trackWidth: Int? = nil
    var trackHeight: Int? = nil

    // get video info
    let track = asset.tracks(withMediaType: AVMediaType.video).first ?? nil
    if track != nil {
      let size = track!.naturalSize.applying(track!.preferredTransform)
      trackWidth = abs(Int(size.width))
      trackHeight = abs(Int(size.height))
    }

    if FileManager.default.fileExists(atPath: thumbnailPath.path) {
      return SharedMediaFile(
        path: forVideo.absoluteString, thumbnail: thumbnailPath.absoluteString, fileName: fileName,
        fileSize: fileSize, width: trackWidth, height: trackHeight, duration: duration,
        mimeType: mimeType, type: .video)
    }

    var saved = false
    let assetImgGenerate = AVAssetImageGenerator(asset: asset)
    assetImgGenerate.appliesPreferredTrackTransform = true
    assetImgGenerate.maximumSize = CGSize(width: 360, height: 360)
    do {
      let img = try assetImgGenerate.copyCGImage(
        at: CMTimeMakeWithSeconds(600, preferredTimescale: Int32(1.0)), actualTime: nil)
      try UIImage.pngData(UIImage(cgImage: img))()?.write(to: thumbnailPath)
      saved = true
    } catch {
      saved = false
    }

    return saved
      ? SharedMediaFile(
        path: forVideo.absoluteString, thumbnail: thumbnailPath.absoluteString, fileName: fileName,
        fileSize: fileSize, width: trackWidth, height: trackHeight, duration: duration,
        mimeType: mimeType, type: .video) : nil
  }

  private func getThumbnailPath(for url: URL) -> URL {
    let fileName = Data(url.lastPathComponent.utf8).base64EncodedString().replacingOccurrences(
      of: "==", with: "")
    let path = FileManager.default
      .containerURL(forSecurityApplicationGroupIdentifier: self.hostAppGroupIdentifier)!
      .appendingPathComponent("\(fileName).jpg")
    return path
  }

  class WebUrl: Codable {
    var url: String
    var meta: String

    init(url: String, meta: String) {
      self.url = url
      self.meta = meta
    }
  }

  class SharedMediaFile: Codable {
    var path: String  // can be image, video or url path
    var thumbnail: String?  // video thumbnail
    var fileName: String  // uuid + extension
    var fileSize: Int?
    var width: Int?  // for image
    var height: Int?  // for image
    var duration: Double?  // video duration in milliseconds
    var mimeType: String
    var type: SharedMediaType

    init(
      path: String, thumbnail: String?, fileName: String, fileSize: Int?, width: Int?, height: Int?,
      duration: Double?, mimeType: String, type: SharedMediaType
    ) {
      self.path = path
      self.thumbnail = thumbnail
      self.fileName = fileName
      self.fileSize = fileSize
      self.width = width
      self.height = height
      self.duration = duration
      self.mimeType = mimeType
      self.type = type
    }
  }

  enum SharedMediaType: Int, Codable {
    case image
    case video
    case file
  }

  func toData(data: [WebUrl]) -> Data? {
    let encodedData = try? JSONEncoder().encode(data)
    return encodedData
  }
  func toData(data: [SharedMediaFile]) -> Data? {
    let encodedData = try? JSONEncoder().encode(data)
    return encodedData
  }
}

internal let mimeTypes = [
  "html": "text/html",
  "htm": "text/html",
  "shtml": "text/html",
  "css": "text/css",
  "xml": "text/xml",
  "gif": "image/gif",
  "jpeg": "image/jpeg",
  "jpg": "image/jpeg",
  "js": "application/javascript",
  "atom": "application/atom+xml",
  "rss": "application/rss+xml",
  "mml": "text/mathml",
  "txt": "text/plain",
  "jad": "text/vnd.sun.j2me.app-descriptor",
  "wml": "text/vnd.wap.wml",
  "htc": "text/x-component",
  "png": "image/png",
  "tif": "image/tiff",
  "tiff": "image/tiff",
  "wbmp": "image/vnd.wap.wbmp",
  "ico": "image/x-icon",
  "jng": "image/x-jng",
  "bmp": "image/x-ms-bmp",
  "svg": "image/svg+xml",
  "svgz": "image/svg+xml",
  "webp": "image/webp",
  "woff": "application/font-woff",
  "jar": "application/java-archive",
  "war": "application/java-archive",
  "ear": "application/java-archive",
  "json": "application/json",
  "hqx": "application/mac-binhex40",
  "doc": "application/msword",
  "pdf": "application/pdf",
  "ps": "application/postscript",
  "eps": "application/postscript",
  "ai": "application/postscript",
  "rtf": "application/rtf",
  "m3u8": "application/vnd.apple.mpegurl",
  "xls": "application/vnd.ms-excel",
  "eot": "application/vnd.ms-fontobject",
  "ppt": "application/vnd.ms-powerpoint",
  "wmlc": "application/vnd.wap.wmlc",
  "kml": "application/vnd.google-earth.kml+xml",
  "kmz": "application/vnd.google-earth.kmz",
  "7z": "application/x-7z-compressed",
  "cco": "application/x-cocoa",
  "jardiff": "application/x-java-archive-diff",
  "jnlp": "application/x-java-jnlp-file",
  "pkpass": "application/vnd.apple.pkpass",
  "run": "application/x-makeself",
  "pl": "application/x-perl",
  "pm": "application/x-perl",
  "prc": "application/x-pilot",
  "pdb": "application/x-pilot",
  "rar": "application/x-rar-compressed",
  "rpm": "application/x-redhat-package-manager",
  "sea": "application/x-sea",
  "swf": "application/x-shockwave-flash",
  "sit": "application/x-stuffit",
  "tcl": "application/x-tcl",
  "tk": "application/x-tcl",
  "der": "application/x-x509-ca-cert",
  "pem": "application/x-x509-ca-cert",
  "crt": "application/x-x509-ca-cert",
  "xpi": "application/x-xpinstall",
  "xhtml": "application/xhtml+xml",
  "xspf": "application/xspf+xml",
  "zip": "application/zip",
  "epub": "application/epub+zip",
  "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "mid": "audio/midi",
  "midi": "audio/midi",
  "kar": "audio/midi",
  "mp3": "audio/mpeg",
  "ogg": "audio/ogg",
  "m4a": "audio/x-m4a",
  "ra": "audio/x-realaudio",
  "3gpp": "video/3gpp",
  "3gp": "video/3gpp",
  "ts": "video/mp2t",
  "mp4": "video/mp4",
  "mpeg": "video/mpeg",
  "mpg": "video/mpeg",
  "mov": "video/quicktime",
  "webm": "video/webm",
  "flv": "video/x-flv",
  "m4v": "video/x-m4v",
  "mng": "video/x-mng",
  "asx": "video/x-ms-asf",
  "asf": "video/x-ms-asf",
  "wmv": "video/x-ms-wmv",
  "avi": "video/x-msvideo",
  "vcf": "text/vcard",
]

extension URL {
  func mimeType(ext: String?) -> String {
    if #available(iOSApplicationExtension 14.0, *) {
      if let pathExt = ext,
        let mimeType = UTType(filenameExtension: pathExt)?.preferredMIMEType
      {
        return mimeType
      } else {
        return "application/octet-stream"
      }
    } else {
      return mimeTypes[ext?.lowercased() ?? ""] ?? "application/octet-stream"
    }
  }
}

extension Array {
  subscript(safe index: UInt) -> Element? {
    return Int(index) < count ? self[Int(index)] : nil
  }
}
