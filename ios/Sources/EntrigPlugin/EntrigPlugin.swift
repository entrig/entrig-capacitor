import Foundation
import Capacitor
import UserNotifications
import EntrigSDK

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
        guard let apiKey = call.getString("apiKey"), !apiKey.isEmpty else {
            call.reject("API key is required and cannot be empty")
            return
        }

        let handlePermission = call.getBool("handlePermission") ?? true
        let config = EntrigConfig(apiKey: apiKey, handlePermission: handlePermission)

        Entrig.configure(config: config) { success, error in
            if success {
                call.resolve()
            } else {
                call.reject(error ?? "Failed to initialize SDK")
            }
        }
    }

    @objc func register(_ call: CAPPluginCall) {
        guard let userId = call.getString("userId"), !userId.isEmpty else {
            call.reject("userId is required")
            return
        }

        Entrig.register(userId: userId, sdk: "capacitor") { success, error in
            if success {
                call.resolve()
            } else {
                call.reject(error ?? "Registration failed")
            }
        }
    }

    @objc func requestPermission(_ call: CAPPluginCall) {
        Entrig.requestPermission { granted, error in
            if let error = error {
                call.reject(error.localizedDescription)
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
                call.reject(error ?? "Unregistration failed")
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

        if #available(iOS 14.0, *) {
            completionHandler([.banner, .sound, .badge])
        } else {
            completionHandler([.alert, .sound, .badge])
        }
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
