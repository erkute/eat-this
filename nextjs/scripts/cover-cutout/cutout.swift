// Stellt das Motiv eines Titelfotos frei und sagt, was darauf zu sehen ist.
//
// Apples Vision, dieselbe Technik wie „Motiv kopieren“ in Fotos. Läuft nur auf
// macOS 14 oder neuer — lokal oder auf einem GitHub-Mac-Runner, nie auf dem
// Server (App Hosting ist Linux). Aufgerufen von build-cover-cutouts.mts:
//
//   swiftc -O cutout.swift -o cutout && ./cutout <foto.jpg> <freisteller.png>
//
// Schreibt den Freisteller in voller Bildgröße (deckungsgleich mit dem Foto,
// das braucht „Vor dem Logo“) und gibt auf stdout eine Zeile JSON aus:
// gefunden?, Anzahl Motive, Rahmen als Anteile des Bildes, berührte Bildränder,
// die Bildklassen mit ihrer Sicherheit („food“ entscheidet über Gericht) und
// wie viel einer erkannten Person im Freisteller liegt („person“, 0 bis 1).

import CoreImage
import Foundation
import Vision

let args = CommandLine.arguments
guard args.count == 3 else {
  FileHandle.standardError.write("usage: cutout <in.jpg> <out.png>\n".data(using: .utf8)!)
  exit(2)
}
let input = URL(fileURLWithPath: args[1])
let output = URL(fileURLWithPath: args[2])

func emit(_ obj: [String: Any]) {
  let data = try! JSONSerialization.data(withJSONObject: obj, options: [.sortedKeys])
  print(String(data: data, encoding: .utf8)!)
}

let handler = VNImageRequestHandler(url: input)
let classify = VNClassifyImageRequest()
let mask = VNGenerateForegroundInstanceMaskRequest()
// Personen werden nie freigestellt, nur Essen (Ansage 03.10.2026: beim
// Döner-Heft stand ein halber Mann ausgeschnitten auf Gelb).
let humans = VNDetectHumanRectanglesRequest()
humans.upperBodyOnly = false
try handler.perform([classify, mask, humans])

var labels: [String: Double] = [:]
for c in (classify.results ?? []) where c.confidence > 0.1 {
  labels[c.identifier] = Double(c.confidence)
}

guard let obs = mask.results?.first, !obs.allInstances.isEmpty else {
  emit(["found": false, "labels": labels])
  exit(0)
}

let buffer = try obs.generateMaskedImage(
  ofInstances: obs.allInstances, from: handler, croppedToInstancesExtent: false)
let image = CIImage(cvPixelBuffer: buffer)
let context = CIContext()
let srgb = CGColorSpace(name: CGColorSpace.sRGB)!
try context.writePNGRepresentation(of: image, to: output, format: .RGBA8, colorSpace: srgb)

// Rahmen und Fläche aus dem Alphakanal — nicht aus der Maske selbst, damit
// beides genau zu dem passt, was im PNG steht.
let width = Int(image.extent.width)
let height = Int(image.extent.height)
var pixels = [UInt8](repeating: 0, count: width * height * 4)
context.render(
  image, toBitmap: &pixels, rowBytes: width * 4, bounds: image.extent, format: .RGBA8,
  colorSpace: srgb)
var minX = width, minY = height, maxX = -1, maxY = -1, area = 0
for y in 0..<height {
  for x in 0..<width where pixels[(y * width + x) * 4 + 3] > 60 {
    area += 1
    if x < minX { minX = x }
    if x > maxX { maxX = x }
    if y < minY { minY = y }
    if y > maxY { maxY = y }
  }
}
guard maxX >= 0 else {
  emit(["found": false, "labels": labels])
  exit(0)
}
// Je erkannter Person: welcher Anteil ihres Rahmens im Freisteller liegt.
// Eine Person im Hintergrund, die die Maske nicht erfasst, zählt kaum; ein
// Koch, der das Gericht hält, steckt mit dem halben Körper darin. Vision
// misst von unten links, das Bild hier von oben.
var person = 0.0
for h in (humans.results ?? []) where h.confidence > 0.3 {
  let bb = h.boundingBox
  let x0 = max(0, Int(bb.minX * Double(width)))
  let x1 = min(width, Int(bb.maxX * Double(width)))
  let y0 = max(0, Int((1 - bb.maxY) * Double(height)))
  let y1 = min(height, Int((1 - bb.minY) * Double(height)))
  guard x1 > x0, y1 > y0 else { continue }
  var inside = 0
  for y in y0..<y1 {
    for x in x0..<x1 where pixels[(y * width + x) * 4 + 3] > 60 { inside += 1 }
  }
  person = max(person, Double(inside) / Double((x1 - x0) * (y1 - y0)))
}

// CIImage rendert hier von oben nach unten (Zeile 0 = oberer Bildrand).
let mx = Double(width) * 0.01, my = Double(height) * 0.01
let edges =
  (Double(minX) <= mx ? 1 : 0) + (Double(minY) <= my ? 1 : 0)
  + (Double(maxX) >= Double(width) - mx ? 1 : 0) + (Double(maxY) >= Double(height) - my ? 1 : 0)

emit([
  "found": true,
  "instances": obs.allInstances.count,
  "width": width,
  "height": height,
  "box": [
    "x": Double(minX) / Double(width),
    "y": Double(minY) / Double(height),
    "w": Double(maxX - minX + 1) / Double(width),
    "h": Double(maxY - minY + 1) / Double(height),
  ],
  "edges": edges,
  "coverage": Double(area) / Double(width * height),
  "labels": labels,
  "person": person,
])
