import Foundation
import Capacitor
import UserNotifications

#if canImport(Entrig)
// SPM - specific imports to avoid module/class name collision
import class Entrig.Entrig
import struct Entrig.EntrigConfig
import struct Entrig.NotificationEvent
import protocol Entrig.OnNotificationReceivedListener
import protocol Entrig.OnNotificationClickListener
#else
// CocoaPods - module is EntrigSDK, no name collision
import EntrigSDK
#endif

@objc(EntrigPlugin)
public class EntrigPlugin: CAPPlugin, CAPBridgedPlugin, OnNotificationReceivedListener, OnNotificationClickListener {
    public let identifier = "EntrigPlugin"
    public let jsName = "Entrig"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "init", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "register", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestPermission", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "unregister", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getInitialNotification", returnType: CAPPluginReturnPromise)
    ]

    // MARK: - Plugin Lifecycle

    @objc override public func load() {
        // Set up UNUserNotificationCenter delegate
        UNUserNotificationCenter.current().delegate = self

        // Set up SDK listeners
        Entrig.setOnForegroundNotificationListener(self)
        Entrig.setOnNotificationOpenedListener(self)

        // Observe Capacitor token registration notifications from AppDelegate
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleDidRegisterForRemoteNotifications(_:)),
            name: .capacitorDidRegisterForRemoteNotifications,
            object: nil
        )
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleDidFailToRegisterForRemoteNotifications(_:)),
            name: .capacitorDidFailToRegisterForRemoteNotifications,
            object: nil
        )

        // Check for launch notification (cold start)
        Entrig.checkLaunchNotification(nil)
    }

    @objc private func handleDidRegisterForRemoteNotifications(_ notification: Notification) {
        guard let deviceToken = notification.object as? Data else { return }
        Entrig.didRegisterForRemoteNotifications(deviceToken: deviceToken)
    }

    @objc private func handleDidFailToRegisterForRemoteNotifications(_ notification: Notification) {
        guard let error = notification.object as? Error else { return }
        Entrig.didFailToRegisterForRemoteNotifications(error: error)
    }

    // MARK: - Plugin Methods

    @objc func `init`(_ call: CAPPluginCall) {
        let apiKey = call.getString("apiKey", "")
        guard !apiKey.isEmpty else {
            call.unavailable("API key is required and cannot be empty")
            return
        }

        let handlePermission = call.getBool("handlePermission", true)
        let showForegroundNotification = call.getBool("showForegroundNotification", true)
        let config = EntrigConfig(apiKey: apiKey, handlePermission: handlePermission, showForegroundNotification: showForegroundNotification)

        Entrig.configure(config: config) { success, error in
            if success {
                call.resolve()
            } else {
                call.unavailable(error ?? "Failed to initialize SDK")
            }
        }
    }

    @objc func register(_ call: CAPPluginCall) {
        let userId = call.getString("userId", "")
        guard !userId.isEmpty else {
            call.unavailable("userId is required")
            return
        }

        // Use caller-provided isDebug if present, otherwise fall back to compile-time flag
        let isDebug: Bool
        if let isDebugOverride = call.getBool("isDebug") {
            isDebug = isDebugOverride
        } else {
            #if DEBUG
            isDebug = true
            #else
            isDebug = false
            #endif
        }

        Entrig.register(userId: userId, sdk: "capacitor", isDebug: isDebug) { success, error in
            if success {
                call.resolve()
            } else {
                call.unavailable(error ?? "Registration failed")
            }
        }
    }

    @objc func requestPermission(_ call: CAPPluginCall) {
        Entrig.requestPermission { granted, error in
            if let error = error {
                call.unavailable(error.localizedDescription)
            } else {
                call.resolve(["granted": granted])
            }
        }
    }

    @objc func unregister(_ call: CAPPluginCall) {
        Entrig.unregister { success, error in
            if success {
                call.resolve()
            } else {
                call.unavailable(error ?? "Unregistration failed")
            }
        }
    }

    @objc func getInitialNotification(_ call: CAPPluginCall) {
        if let event = Entrig.getInitialNotification() {
            call.resolve(notificationToDict(event))
        } else {
            call.resolve([:])
        }
    }

    // MARK: - Notification Listeners

    public func onNotificationReceived(_ event: NotificationEvent) {
        notifyListeners("onForegroundNotification", data: notificationToDict(event))
    }

    public func onNotificationClick(_ event: NotificationEvent) {
        notifyListeners("onNotificationOpened", data: notificationToDict(event))
    }

    // MARK: - Helpers

    private func notificationToDict(_ event: NotificationEvent) -> [String: Any] {
        return [
            "title": event.title,
            "body": event.body,
            "data": event.data,
            "isForeground": false
        ]
    }
}

// MARK: - UNUserNotificationCenterDelegate

extension EntrigPlugin: UNUserNotificationCenterDelegate {
    public func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        Entrig.willPresentNotification(notification)
        completionHandler(Entrig.getPresentationOptions())
    }

    public func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        Entrig.didReceiveNotification(response)
        completionHandler()
    }
}
