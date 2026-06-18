import { registerPlugin } from '@capacitor/core';

import type { EntrigPlugin, NotificationEvent } from './definitions';
import { sdkVersion } from './version';

type EntrigRegisterOptions = {
  userId: string;
  isDebug?: boolean;
};

type EntrigPluginInternal = Omit<EntrigPlugin, 'register'> & {
  register(options: EntrigRegisterOptions & { sdkVersion?: string }): Promise<void>;
};

const EntrigNative = registerPlugin<EntrigPluginInternal>('Entrig', {
  web: () => import('./web').then((m) => new m.EntrigWeb()),
});

const Entrig: EntrigPlugin = {
  init(config) {
    return EntrigNative.init(config);
  },
  register(options) {
    return EntrigNative.register({
      ...options,
      sdkVersion,
    });
  },
  requestPermission() {
    return EntrigNative.requestPermission();
  },
  unregister() {
    return EntrigNative.unregister();
  },
  async getInitialNotification() {
    const result = await EntrigNative.getInitialNotification();
    // Both native platforms resolve with {} when there is no initial notification
    // (Capacitor has no way to resolve with null from native). Normalize to null.
    if (!result || Object.keys(result).length === 0) return null;
    return result as NotificationEvent;
  },
  addListener(eventName, listenerFunc) {
    return (EntrigNative.addListener as any)(eventName, listenerFunc);
  },
  removeAllListeners() {
    return EntrigNative.removeAllListeners();
  },
};

export * from './definitions';
export { Entrig };
