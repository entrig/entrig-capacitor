package com.entrig.plugin.capacitor

import android.Manifest
import android.content.Intent
import android.os.Build
import android.util.Log
import com.getcapacitor.JSObject
import com.getcapacitor.PermissionState
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback
import com.entrig.sdk.Entrig
import com.entrig.sdk.models.EntrigConfig
import com.entrig.sdk.models.NotificationEvent

@CapacitorPlugin(
    name = "Entrig",
    permissions = [
        Permission(
            alias = "notifications",
            strings = [Manifest.permission.POST_NOTIFICATIONS]
        )
    ]
)
class EntrigPlugin : Plugin() {

    companion object {
        private const val TAG = "EntrigPlugin"
    }

    override fun load() {
        // Set activity on SDK for foreground detection (lifecycle callbacks
        // registered in initialize() won't fire for already-resumed activities)
        bridge.activity?.let { Entrig.setActivity(it) }

        // Handle initial intent (app launched from notification tap)
        bridge.activity?.intent?.let { intent ->
            Entrig.handleIntent(intent)
        }

        Entrig.setOnForegroundNotificationListener { notification ->
            Log.d(TAG, "Foreground notification received")
            notifyListeners("onForegroundNotification", notification.toJSObject(isForeground = true))
        }

        Entrig.setOnNotificationOpenedListener { notification ->
            Log.d(TAG, "Notification opened")
            notifyListeners("onNotificationOpened", notification.toJSObject(isForeground = false))
        }
    }

    @PluginMethod
    fun init(call: PluginCall) {
        val apiKey = call.getString("apiKey")
        if (apiKey.isNullOrEmpty()) {
            call.reject("API key is required and cannot be empty")
            return
        }

        val showForegroundNotification = call.getBoolean("showForegroundNotification") ?: true
        val config = EntrigConfig(
            apiKey = apiKey,
            handlePermission = false,
            showForegroundNotification = showForegroundNotification
        )

        Entrig.initialize(context.applicationContext, config) { success, error ->
            if (success) {
                call.resolve()
            } else {
                call.reject(error ?: "Failed to initialize SDK")
            }
        }
    }

    @PluginMethod
    fun register(call: PluginCall) {
        val userId = call.getString("userId")
        if (userId.isNullOrEmpty()) {
            call.reject("userId is required")
            return
        }
        // isDebug is accepted for API consistency but auto-detected by the Android SDK internally
        // val isDebug = call.getBoolean("isDebug")

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            getPermissionState("notifications") != PermissionState.GRANTED
        ) {
            requestPermissionForAlias("notifications", call, "onRegisterPermissionResult")
            return
        }

        doRegister(call)
    }

    @PermissionCallback
    private fun onRegisterPermissionResult(call: PluginCall) {
        doRegister(call)
    }

    private fun doRegister(call: PluginCall) {
        val userId = call.getString("userId")!!
        Entrig.register(userId, activity, "capacitor") { success, error ->
            if (success) {
                call.resolve()
            } else {
                call.reject(error ?: "Registration failed")
            }
        }
    }

    @PluginMethod
    fun requestPermission(call: PluginCall) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            getPermissionState("notifications") != PermissionState.GRANTED
        ) {
            requestPermissionForAlias("notifications", call, "onRequestPermissionResult")
            return
        }

        val ret = JSObject()
        ret.put("granted", true)
        call.resolve(ret)
    }

    @PermissionCallback
    private fun onRequestPermissionResult(call: PluginCall) {
        val granted = getPermissionState("notifications") == PermissionState.GRANTED
        val ret = JSObject()
        ret.put("granted", granted)
        call.resolve(ret)
    }

    @PluginMethod
    fun unregister(call: PluginCall) {
        Entrig.unregister { success, error ->
            if (success) {
                call.resolve()
            } else {
                call.reject(error ?: "Unregistration failed")
            }
        }
    }

    @PluginMethod
    fun getInitialNotification(call: PluginCall) {
        val initialNotification = Entrig.getInitialNotification()
        if (initialNotification != null) {
            call.resolve(initialNotification.toJSObject())
        } else {
            call.resolve(JSObject())
        }
    }

    override fun handleOnNewIntent(intent: Intent) {
        super.handleOnNewIntent(intent)
        Entrig.handleIntent(intent)
    }

    private fun NotificationEvent.toJSObject(isForeground: Boolean = false): JSObject {
        val obj = JSObject()
        obj.put("title", title)
        obj.put("body", body)
        obj.put("type", type)
        obj.put("deliveryId", deliveryId)

        val dataObj = JSObject()
        data?.forEach { (key, value) ->
            dataObj.put(key, value)
        }
        obj.put("data", dataObj)
        obj.put("isForeground", isForeground)
        return obj
    }
}
