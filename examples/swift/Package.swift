// swift-tools-version:5.9
// A package that depends on Links Notation the way a downstream project does.
// It points at this checkout; a real project names the repository instead:
//
//     .package(url: "https://github.com/link-foundation/links-notation.git", from: "0.30.0")
import PackageDescription

let package = Package(
    name: "LinksNotationSwiftExample",
    platforms: [.macOS(.v13), .iOS(.v16)],
    dependencies: [
        .package(name: "links-notation", path: "../..")
    ],
    targets: [
        .executableTarget(
            name: "links-notation-swift-example",
            dependencies: [.product(name: "LinksNotation", package: "links-notation")],
            path: "Sources/LinksNotationSwiftExample")
    ]
)
