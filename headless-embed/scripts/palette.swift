// Extract a screenshot's dominant colors (for theme tokens), or sample exact pixels.
//   swift palette.swift shot.png                 -> top 16 colors with share of pixels
//   swift palette.swift shot.png 120,40 900,520  -> hex at those (x,y) image-pixel points
import AppKit
let a = CommandLine.arguments
guard a.count > 1, let img = NSImage(contentsOfFile: a[1]), let tiff = img.tiffRepresentation,
      let rep = NSBitmapImageRep(data: tiff) else { print("usage: swift palette.swift <png> [x,y ...]"); exit(1) }
func hex(_ c: NSColor) -> String {
  let c = c.usingColorSpace(.sRGB)!
  return String(format: "#%02x%02x%02x", Int(c.redComponent * 255), Int(c.greenComponent * 255), Int(c.blueComponent * 255))
}
if a.count > 2 {
  for p in a[2...] {
    let xy = p.split(separator: ",").compactMap { Int($0) }
    if xy.count == 2, let c = rep.colorAt(x: xy[0], y: xy[1]) { print("\(p)  \(hex(c))") }
  }
  exit(0)
}
var counts: [String: Int] = [:]
let step = max(1, min(rep.pixelsWide, rep.pixelsHigh) / 300)
var total = 0
for y in stride(from: 0, to: rep.pixelsHigh, by: step) {
  for x in stride(from: 0, to: rep.pixelsWide, by: step) {
    guard let c = rep.colorAt(x: x, y: y)?.usingColorSpace(.sRGB) else { continue }
    // quantize to 4 bits/channel so near-identical shades group together
    let q = String(format: "#%x%x%x", Int(c.redComponent * 15.99), Int(c.greenComponent * 15.99), Int(c.blueComponent * 15.99))
    counts[q, default: 0] += 1; total += 1
  }
}
print("size \(rep.pixelsWide)x\(rep.pixelsHigh); share  color(#rgb, 4-bit)")
for (k, v) in counts.sorted(by: { $0.value > $1.value }).prefix(16) {
  let s = Array(k.dropFirst()).map { String($0) + String($0) }.joined()
  print(String(format: "%5.1f%%  #%@", 100.0 * Double(v) / Double(total), s))
}
