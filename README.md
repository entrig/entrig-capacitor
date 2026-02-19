# Entrig

**Push Notifications for Supabase**

Send push notifications to your Capacitor app, triggered by database events.

---


## Prerequisites

1. **Create Entrig Account** - Sign up at [entrig.com](https://entrig.com?ref=npm)

2. **Connect Supabase** - Authorize Entrig to access your Supabase project

   <details>
   <summary>How it works (click to expand)</summary>

   During onboarding, you'll:
   1. Click the "Connect Supabase" button
   2. Sign in to your Supabase account (if not already signed in)
   3. Authorize Entrig to access your project
   4. Select which project to use (if you have multiple)

   That's it! Entrig will automatically set up everything needed to send notifications. No manual SQL or configuration required.

   </details>

3. **Upload FCM Service Account** (Android) - Upload Service Account JSON and provide your Application ID

   <details>
   <summary>How to get FCM Service Account JSON (click to expand)</summary>

   1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
   2. Add your Android app to the project
   3. Go to Project Settings → Service Accounts
   4. Click "Firebase Admin SDK"
   5. Click "Generate new private key"
   6. Download the JSON file
   7. Upload this file to the Entrig dashboard

   </details>

   <details>
   <summary>What is Application ID? (click to expand)</summary>

   The Application ID is your Android app's package name (e.g., `com.example.myapp`). You can find it in:
   - Your `android/app/build.gradle` file under `applicationId`
   - Or in your `AndroidManifest.xml` under the `package` attribute

   </details>

   > **Note:** If you've configured iOS in your Firebase console, you can use FCM for both Android and iOS, which will skip the APNs setup step.

4. **Upload APNs Key** (iOS) - Upload `.p8` key file with Team ID, Bundle ID, and Key ID to Entrig

   <details>
   <summary>How to get APNs Authentication Key (click to expand)</summary>

   1. Enroll in [Apple Developer Program](https://developer.apple.com/programs/)
   2. Go to [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources)
   3. Navigate to Keys → Click "+" to create a new key
   4. Enter a key name and enable "Apple Push Notifications service (APNs)"
   5. Click "Continue" then "Register"
   6. Download the `.p8` key file (you can only download this once!)
   7. Note your **Key ID** (shown on the confirmation page - 10 alphanumeric characters)
   8. Note your **Team ID** (found in Membership section of your Apple Developer account - 10 alphanumeric characters)
   9. Note your **Bundle ID** (found in your Xcode project settings or `Info.plist` - reverse domain format like `com.example.app`)
   10. Upload the `.p8` file along with Team ID, Bundle ID, and Key ID to the Entrig dashboard

   </details>

   <details>
   <summary>Production vs Sandbox environments (click to expand)</summary>

   Entrig supports configuring both APNs environments:
   - **Production**: For App Store releases and TestFlight builds
   - **Sandbox**: For development builds via Xcode

   You can configure one or both environments during onboarding. Developers typically need Sandbox for testing and Production for live releases. You can use the same APNs key for both environments, but you'll need to provide the configuration separately for each.

   </details>

---

## Installation

```bash
npm install @entrig/capacitor
npx cap sync
```

---

## Platform Setup

### Android

No setup required for Android. We'll take care of it.

### iOS

#### Automatic Setup (Recommended)

Run this command in your project root:

```bash
npx @entrig/capacitor setup ios
```

This automatically configures:
- AppDelegate.swift with push notification token handlers
- App.entitlements with push notification entitlements (and links it in Xcode project)
- Info.plist with background modes

> **Note:** The command creates `.backup` files for safety. You can delete them after verifying everything works.

<details>
<summary>Troubleshooting CocoaPods issues (click to expand)</summary>

If you encounter CocoaPods dependency errors, try cleaning and updating:

```bash
cd ios
rm Podfile.lock
rm -rf Pods
pod deintegrate
pod repo update
pod install
```

</details>

<details>
<summary>Troubleshooting SPM / Xcode build issues (click to expand)</summary>

If you encounter build errors after adding the plugin (e.g., `Cannot convert value of type 'NSUserActivity'`, missing methods on `CAPPluginCall`, or unresolved module errors), try resetting the SPM package cache:

1. Open your Xcode project (`ios/App/App.xcworkspace`)
2. **File → Packages → Reset Package Caches**
3. **File → Packages → Resolve Package Versions**
4. **Product → Clean Build Folder** (Cmd+Shift+K)
5. Build again (Cmd+B)

If you see `Cannot convert value of type 'NSUserActivity' to expected argument type 'URL'` in `AppDelegate.swift`, this is a known Capacitor 8 SPM issue. Replace:

```swift
return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
```

with:

```swift
return true
```

</details>

<details>
<summary>Notification Service Extension (Optional - for Delivery Tracking)</summary>

The Notification Service Extension enables delivery status tracking even when your app is killed or in the background.

#### 1. Create Notification Service Extension in Xcode

1. Open `ios/App/App.xcworkspace`
2. File → New → Target → Notification Service Extension
3. Product Name: `NotificationService`, Language: Swift
4. Click "Cancel" when asked to activate scheme

#### 2. Update NotificationService.swift

```swift
import UserNotifications
import EntrigSDK

class NotificationService: UNNotificationServiceExtension {

    var contentHandler: ((UNNotificationContent) -> Void)?
    var bestAttemptContent: UNMutableNotificationContent?

    override func didReceive(_ request: UNNotificationRequest, withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void) {
        self.contentHandler = contentHandler
        bestAttemptContent = (request.content.mutableCopy() as? UNMutableNotificationContent)

        // Report delivered status to Entrig
        let apiKey = "YOUR_ENTRIG_API_KEY"
        Entrig.reportDelivered(request: request, apiKey: apiKey)

        if let bestAttemptContent = bestAttemptContent {
            contentHandler(bestAttemptContent)
        }
    }

    override func serviceExtensionTimeWillExpire() {
        if let contentHandler = contentHandler, let bestAttemptContent = bestAttemptContent {
            contentHandler(bestAttemptContent)
        }
    }
}
```

#### 3. Link EntrigSDK framework to the extension target

In Build Settings for the NotificationService target, ensure the EntrigSDK pod/framework is linked.

</details>

<details>
<summary>Manual AppDelegate setup (click to expand)</summary>

#### 1. Enable Push Notifications in Xcode

- Open `ios/App/App.xcworkspace`
- Select App target → Signing & Capabilities
- Click `+ Capability` → Push Notifications
- Click `+ Capability` → Background Modes → Enable `Remote notifications`

#### 2. Update AppDelegate.swift

Add the following methods to your `AppDelegate` class:

```swift
func application(_ application: UIApplication,
                 didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
    NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
}

func application(_ application: UIApplication,
                 didFailToRegisterForRemoteNotificationsWithError error: Error) {
    NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
}
```

</details>


---

## Usage

### Initialize

```typescript
import { Entrig } from '@entrig/capacitor';

// Initialize Entrig
await Entrig.init({ apiKey: 'YOUR_ENTRIG_API_KEY' });
```

<details>
<summary>How to get your Entrig API key (click to expand)</summary>

1. Sign in to your Entrig account at [entrig.com](https://entrig.com)
2. Go to your dashboard
3. Navigate to your project settings
4. Copy your **API Key** from the project settings page
5. Use this API key in the `Entrig.init()` call above

</details>

### Register

Register the device when the user signs in:

```typescript
await Entrig.register({ userId: 'user-id' });
```

> **Note:** `register()` automatically handles notification permission requests. The `userId` you pass here must match the user identifier field you select when creating notifications in the Entrig dashboard.

Unregister when the user signs out:

```typescript
await Entrig.unregister();
```

**Example with Supabase Auth:**

```typescript
import { Entrig } from '@entrig/capacitor';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient('YOUR_SUPABASE_URL', 'YOUR_SUPABASE_ANON_KEY');

// Initialize Entrig
await Entrig.init({ apiKey: 'YOUR_ENTRIG_API_KEY' });

// Register/unregister on auth state changes
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_IN' && session?.user) {
    await Entrig.register({ userId: session.user.id });
  } else if (event === 'SIGNED_OUT') {
    await Entrig.unregister();
  }
});
```

> **Important:** When using Supabase Auth, devices are registered with the **Supabase Auth user ID** (`auth.users.id`). When creating notifications, make sure the user identifier field you select contains this same Supabase Auth user ID to ensure notifications are delivered to the correct users.

<details>
<summary>Custom Permission Handling (click to expand)</summary>

If you want to handle notification permissions yourself, disable automatic permission handling:

```typescript
await Entrig.init({
  apiKey: 'YOUR_ENTRIG_API_KEY',
  handlePermission: false,
});
```

Then request permissions manually before registering:

```typescript
const { granted } = await Entrig.requestPermission();
if (granted) {
  await Entrig.register({ userId: 'user-id' });
}
```

</details>

### Listen to Notifications

**Foreground notifications** (when app is open):

```typescript
Entrig.addListener('onForegroundNotification', (event) => {
  // Handle notification received while app is in foreground
  // Access: event.title, event.body, event.type, event.data
});
```

**Notification tap** (when user taps a notification):

```typescript
Entrig.addListener('onNotificationOpened', (event) => {
  // Handle notification tap - navigate to specific screen based on event.type or event.data
});
```

**NotificationEvent** contains:
- `title` - Notification title
- `body` - Notification body text
- `type` - Optional custom type identifier (e.g., `"new_message"`, `"order_update"`)
- `data` - Optional custom payload data from your database

---

## Creating Notifications

<details>
<summary>Learn how to create notification triggers in the dashboard (click to expand)</summary>

Create notification triggers in the Entrig dashboard. The notification creation form has two sections: configuring the trigger and composing the notification message.

### Section 1: Configure Trigger

Set up when and to whom notifications should be sent.

#### 1. Select Table
Choose the database table where events will trigger notifications (e.g., `messages`, `orders`). This is the "trigger table" that activates the notification.

#### 2. Select Event
Choose which database operation triggers the notification:
- **INSERT** - When new rows are created
- **UPDATE** - When existing rows are modified
- **DELETE** - When rows are deleted

#### 3. Select User Identifier
Specify how to identify notification recipients. Toggle "Use join table" to switch between modes.

> **Important:** The user identifier field you select here must contain the same user ID that was used when registering the device.

**Single User Mode** (Default):
- Select a field that contains the user ID directly
- Supports foreign key navigation (e.g., navigate through `orders.customer_id` to reach `customers.user_id`)
- Example: For a `messages` table with `user_id` field, select `user_id`
- The selected field should contain the same user ID used during device registration

**Multi-User Mode** (Join Table):
- Use when one database event should notify multiple users
- Requires configuring the relationship between tables:

  **Event Table Section:**
  - **Lookup Field**: Select a foreign key field that links to your join table
    - Example: For notifying all room members when a message is sent, select `room_id` from the `messages` table

  **Join Table Section:**
  - **Join Table**: Select the table containing recipient records
    - Example: `room_members` table that links rooms to users
  - **Matching Field**: Field in the join table that matches your lookup field
    - Usually auto-populated to match the lookup field name
    - Example: `room_id` in `room_members`
  - **User ID Field**: Field containing the actual user identifiers
    - Supports foreign key navigation
    - Example: `user_id` in `room_members`
    - Should contain the same user ID used during device registration (e.g., Supabase Auth user ID)

#### 4. Event Conditions (Optional)
Filter when notifications are sent based on the trigger event data:
- Add conditions to control notification sending (e.g., only when `status = 'completed'`)
- Supports multiple conditions with AND/OR logic
- Conditions check the row data from the trigger table

#### 5. Recipient Filters (Optional, Multi-User only)
Filter which users receive the notification based on join table data:
- Example: Only notify users where `role = 'admin'` in the join table
- Different from Event Conditions - these filter recipients, not events

### Section 2: Compose Notification

Design the notification content that users will see.

#### 1. Notification Type (Optional)
Add a custom type identifier for your app to recognize this notification:
- Example values: `new_message`, `order_update`, `friend_request`
- Access via `event.type` in your notification listeners
- Use to route users to different screens or handle notifications differently

#### 2. Payload Data (Optional)
Select database fields to use as dynamic placeholders:
- Click "Add Fields" to open the field selector
- Selected fields appear as clickable pills (e.g., `{{messages.content}}`)
- Click any pill to insert it at your cursor position in title or body
- Supports nested field selection through foreign keys

#### 3. Title & Body
Write your notification text using placeholders:
- Use double-brace format: `{{table.column}}`
- Example Title: `New message from {{users.name}}`
- Example Body: `{{messages.content}}`
- Placeholders are replaced with actual data when notifications are sent
- Title appears as the notification headline
- Body appears as the notification message

### What Happens Behind the Scenes

When you create a notification, Entrig automatically:
1. Enables `pg_net` extension in your Supabase project
2. Creates a PostgreSQL function to send HTTP requests to Entrig
3. Sets up a database trigger on your selected table
4. Configures webhook endpoint for your notification

No manual SQL or backend code required!

### Example Use Cases

**Single User Notification:**
- **Table**: `orders`, **Event**: `INSERT`
- **User ID**: `customer_id`
- **Title**: `Order Confirmed!`
- **Body**: `Your order #{{orders.id}} has been received`

**Multi-User Notification (Group Chat):**
- **Table**: `messages`, **Event**: `INSERT`
- **Lookup Field**: `room_id`
- **Join Table**: `room_members`
- **Matching Field in Join Table**: `room_id`
- **User ID**: `user_id`
- **Title**: `New message in {{messages.room_name}}`
- **Body**: `{{messages.sender_name}}: {{messages.content}}`

</details>

---

## Support

- Email: team@entrig.com

---
