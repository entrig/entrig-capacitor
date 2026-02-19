// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "EntrigCapacitor",
    platforms: [.iOS(.v15)],
    products: [
        .library(
            name: "EntrigCapacitor",
            targets: ["EntrigPlugin"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "8.0.0"),
        .package(url: "https://github.com/entrig/entrig-ios.git", from: "1.0.0")
    ],
    targets: [
        .target(
            name: "EntrigPlugin",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm"),
                .product(name: "Entrig", package: "entrig-ios")
            ],
            path: "ios/Sources/EntrigPlugin"),
        .testTarget(
            name: "EntrigPluginTests",
            dependencies: ["EntrigPlugin"],
            path: "ios/Tests/EntrigPluginTests")
    ]
)
