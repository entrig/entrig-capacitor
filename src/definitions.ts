import type { PluginListenerHandle } from '@capacitor/core';

export interface EntrigConfig {
  apiKey: string;
  handlePermission?: boolean;
  showForegroundNotification?: boolean;
}

export interface NotificationEvent {
  title: string;
  body: string;
  data: Record<string, any>;
  isForeground: boolean;
}

export interface EntrigPlugin {
  init(config: EntrigConfig): Promise<void>;
  register(options: { userId: string }): Promise<void>;
  requestPermission(): Promise<{ granted: boolean }>;
  unregister(): Promise<void>;
  getInitialNotification(): Promise<NotificationEvent | null>;

  addListener(
    eventName: 'onForegroundNotification',
    listenerFunc: (event: NotificationEvent) => void,
  ): Promise<PluginListenerHandle>;

  addListener(
    eventName: 'onNotificationOpened',
    listenerFunc: (event: NotificationEvent) => void,
  ): Promise<PluginListenerHandle>;

  removeAllListeners(): Promise<void>;
}
