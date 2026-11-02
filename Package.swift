// swift-tools-version:5.9
// The Swift implementation of Links Notation lives in `swift/`; this manifest
// sits at the repository root because SwiftPM resolves a package from the root
// of its Git repository.
import PackageDescription

let package = Package(
    name: "LinksNotation",
    platforms: [.macOS(.v13), .iOS(.v16)],
    products: [
        .library(name: "LinksNotation", targets: ["LinksNotation"]),
        .executable(name: "binary-lino", targets: ["BinaryLinoExample"]),
    ],
    targets: [
        .target(name: "LinksNotation", path: "swift/Sources/LinksNotation"),
        .executableTarget(
            name: "BinaryLinoExample",
            dependencies: ["LinksNotation"],
            path: "swift/Sources/BinaryLinoExample"),
        .testTarget(
            name: "LinksNotationTests",
            dependencies: ["LinksNotation"],
            path: "swift/Tests/LinksNotationTests"),
    ]
)
