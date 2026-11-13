// Render one page of a PDF to PNG (macOS; `sips` only renders page 1).
//   swift pdf-page.swift in.pdf out.png <zero-based page index>   -> prints the page count
import PDFKit
import AppKit
let a = CommandLine.arguments
let doc = PDFDocument(url: URL(fileURLWithPath: a[1]))!
print("pages", doc.pageCount)
let i = Int(a[3])!
if i < doc.pageCount, let page = doc.page(at: i) {
  let img = page.thumbnail(of: NSSize(width: 1100, height: 850), for: .mediaBox)
  try! NSBitmapImageRep(data: img.tiffRepresentation!)!.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: a[2]))
}
