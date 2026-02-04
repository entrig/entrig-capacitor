#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);

if (args.length < 2 || args[0] !== "setup" || args[1] !== "ios") {
  console.log("Usage: npx entrig-capacitor setup ios");
  process.exit(1);
}

console.log("🔧 Entrig Capacitor iOS Setup\n");

// Capacitor iOS project structure: ios/App/App/
const iosDir = path.join(process.cwd(), "ios");
if (!fs.existsSync(iosDir)) {
  console.log("❌ Error: ios/ directory not found");
  console.log("   Make sure you run this from your Capacitor project root.");
  console.log('   Run "npx cap add ios" first if you haven\'t.');
  process.exit(1);
}

const appDir = path.join(iosDir, "App", "App");
if (!fs.existsSync(appDir)) {
  console.log("❌ Error: ios/App/App/ directory not found");
  console.log("   This doesn't look like a standard Capacitor project.");
  process.exit(1);
}

console.log("✅ Found Capacitor iOS project\n");

updateAppDelegate(appDir);
updateEntitlements(appDir);
updateInfoPlist(appDir);

console.log("\n🎉 Setup complete! Rebuild your iOS app to apply changes.\n");

// ─── AppDelegate ────────────────────────────────────────────────────────

function updateAppDelegate(appDir) {
  const appDelegatePath = path.join(appDir, "AppDelegate.swift");

  if (!fs.existsSync(appDelegatePath)) {
    console.log("❌ Error: AppDelegate.swift not found");
    process.exit(1);
  }

  console.log(
    `📝 Checking ${path.relative(process.cwd(), appDelegatePath)}...`,
  );

  let content = fs.readFileSync(appDelegatePath, "utf8");

  // Already configured?
  if (content.includes("capacitorDidRegisterForRemoteNotifications")) {
    console.log("✅ Entrig is already configured in AppDelegate.swift");
    return;
  }

  // Check if delegate methods already exist
  const hasTokenMethod = content.includes(
    "didRegisterForRemoteNotificationsWithDeviceToken",
  );
  const hasFailMethod = content.includes(
    "didFailToRegisterForRemoteNotificationsWithError",
  );

  if (hasTokenMethod || hasFailMethod) {
    console.log(
      "⚠️  Existing push notification delegate methods detected.",
    );
    console.log("   Please ensure they post Capacitor notifications:\n");
    if (hasTokenMethod) {
      console.log("   In didRegisterForRemoteNotificationsWithDeviceToken:");
      console.log(
        "     NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)\n",
      );
    }
    if (hasFailMethod) {
      console.log("   In didFailToRegisterForRemoteNotificationsWithError:");
      console.log(
        "     NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)\n",
      );
    }
    return;
  }

  // Backup
  const backupPath = appDelegatePath + ".backup";
  fs.copyFileSync(appDelegatePath, backupPath);
  console.log(`💾 Backup created: ${path.relative(process.cwd(), backupPath)}`);

  // Add delegate methods before the last closing brace
  const methodsToAdd = `
    // MARK: - Push Notification Token Handling

    func application(_ application: UIApplication,
                     didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
    }

    func application(_ application: UIApplication,
                     didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }
`;

  const lastBraceIndex = content.lastIndexOf("}");
  if (lastBraceIndex !== -1) {
    content =
      content.slice(0, lastBraceIndex) +
      methodsToAdd +
      content.slice(lastBraceIndex);
  }

  fs.writeFileSync(appDelegatePath, content);

  console.log("✅ Configured AppDelegate.swift:");
  console.log("   • Added didRegisterForRemoteNotifications method");
  console.log("   • Added didFailToRegisterForRemoteNotifications method");
}

// ─── Entitlements ───────────────────────────────────────────────────────

function updateEntitlements(appDir) {
  // Capacitor entitlements: ios/App/App/App.entitlements or *.entitlements
  let entitlementsPath = null;
  let entitlementsFileName = null;

  const files = fs.readdirSync(appDir);
  for (const f of files) {
    if (f.endsWith(".entitlements")) {
      entitlementsPath = path.join(appDir, f);
      entitlementsFileName = f;
      break;
    }
  }

  if (!entitlementsPath) {
    // Create default entitlements
    entitlementsFileName = "App.entitlements";
    entitlementsPath = path.join(appDir, entitlementsFileName);
    const defaultEntitlements = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
\t<key>aps-environment</key>
\t<string>development</string>
</dict>
</plist>`;

    fs.writeFileSync(entitlementsPath, defaultEntitlements);
    console.log(
      `\n📝 Created: ${path.relative(process.cwd(), entitlementsPath)}`,
    );
    console.log("✅ Added aps-environment to entitlements");
  } else {
    console.log(
      `\n📝 Checking ${path.relative(process.cwd(), entitlementsPath)}...`,
    );

    let content = fs.readFileSync(entitlementsPath, "utf8");

    if (content.includes("aps-environment")) {
      console.log("✅ aps-environment already configured");
    } else {
      // Backup
      const backupPath = entitlementsPath + ".backup";
      fs.copyFileSync(entitlementsPath, backupPath);
      console.log(`💾 Backup created: ${path.relative(process.cwd(), backupPath)}`);

      const apsEntry = `\t<key>aps-environment</key>\n\t<string>development</string>\n`;

      if (content.includes("<dict/>")) {
        content = content.replace("<dict/>", `<dict>\n${apsEntry}</dict>`);
      } else {
        const insertPoint = content.lastIndexOf("</dict>");
        if (insertPoint === -1) {
          console.log("❌ Error: Could not parse entitlements file");
          return;
        }
        content = content.slice(0, insertPoint) + apsEntry + content.slice(insertPoint);
      }

      fs.writeFileSync(entitlementsPath, content);
      console.log("✅ Added aps-environment to entitlements");
    }
  }

  // Link entitlements in project.pbxproj
  linkEntitlementsInXcodeProject(appDir, entitlementsFileName);
}

function linkEntitlementsInXcodeProject(appDir, entitlementsFileName) {
  const pbxprojPath = path.join(appDir, "..", "App.xcodeproj", "project.pbxproj");

  if (!fs.existsSync(pbxprojPath)) {
    console.log("⚠️  Warning: project.pbxproj not found, skipping entitlements linking");
    console.log("   Please manually enable Push Notifications in Xcode:");
    console.log("   Target > Signing & Capabilities > + Capability > Push Notifications");
    return;
  }

  let content = fs.readFileSync(pbxprojPath, "utf8");

  if (content.includes("CODE_SIGN_ENTITLEMENTS")) {
    console.log("✅ CODE_SIGN_ENTITLEMENTS already set in Xcode project");
    return;
  }

  // Insert CODE_SIGN_ENTITLEMENTS after INFOPLIST_FILE = App/Info.plist;
  // This is specific to app target build settings (Debug & Release)
  const entitlementsValue = `App/${entitlementsFileName}`;
  const anchor = "INFOPLIST_FILE = App/Info.plist;";

  if (!content.includes(anchor)) {
    console.log("⚠️  Could not find INFOPLIST_FILE in project.pbxproj");
    console.log("   Please manually enable Push Notifications in Xcode:");
    console.log("   Target > Signing & Capabilities > + Capability > Push Notifications");
    return;
  }

  content = content.replace(
    new RegExp(anchor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
    `${anchor}\n\t\t\t\tCODE_SIGN_ENTITLEMENTS = "${entitlementsValue}";`,
  );

  fs.writeFileSync(pbxprojPath, content);
  console.log("✅ Linked entitlements in Xcode project");
}

// ─── Info.plist ─────────────────────────────────────────────────────────

function updateInfoPlist(appDir) {
  const infoPlistPath = path.join(appDir, "Info.plist");

  if (!fs.existsSync(infoPlistPath)) {
    console.log(
      `\n⚠️  Warning: ${path.relative(process.cwd(), infoPlistPath)} not found`,
    );
    return;
  }

  console.log(
    `\n📝 Checking ${path.relative(process.cwd(), infoPlistPath)}...`,
  );

  let content = fs.readFileSync(infoPlistPath, "utf8");

  if (
    content.includes("UIBackgroundModes") &&
    content.includes("remote-notification")
  ) {
    console.log("✅ UIBackgroundModes already configured");
    return;
  }

  // Backup
  const backupPath = infoPlistPath + ".backup";
  fs.copyFileSync(infoPlistPath, backupPath);
  console.log(`💾 Backup created: ${path.relative(process.cwd(), backupPath)}`);

  if (content.includes("UIBackgroundModes")) {
    // Add remote-notification to existing array
    const arrayMatch = content.match(
      /<key>UIBackgroundModes<\/key>\s*<array>/,
    );
    if (arrayMatch) {
      const insertPoint = arrayMatch.index + arrayMatch[0].length;
      const newEntry = "\n\t\t<string>remote-notification</string>";
      content =
        content.slice(0, insertPoint) + newEntry + content.slice(insertPoint);
    }
  } else {
    // Add UIBackgroundModes before closing </dict>
    const plistEnd = content.lastIndexOf("</plist>");
    const dictEnd = content.lastIndexOf("</dict>", plistEnd);

    if (dictEnd === -1) {
      console.log("❌ Error: Could not parse Info.plist");
      return;
    }

    const bgModes = `\t<key>UIBackgroundModes</key>\n\t<array>\n\t\t<string>remote-notification</string>\n\t</array>\n`;
    content = content.slice(0, dictEnd) + bgModes + content.slice(dictEnd);
  }

  fs.writeFileSync(infoPlistPath, content);
  console.log("✅ Added remote-notification to UIBackgroundModes");
}
