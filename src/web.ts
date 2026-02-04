import { WebPlugin } from '@capacitor/core';

import type { EntrigPlugin, EntrigConfig, NotificationEvent } from './definitions';

export class EntrigWeb extends WebPlugin implements EntrigPlugin {
  async init(_config: EntrigConfig): Promise<void> {
    console.warn('Entrig push notifications are not supported on web');
  }

  async register(_options: { userId: string }): Promise<void> {
    console.warn('Entrig push notifications are not supported on web');
  }

  async requestPermission(): Promise<{ granted: boolean }> {
    console.warn('Entrig push notifications are not supported on web');
    return { granted: false };
  }

  async unregister(): Promise<void> {
    console.warn('Entrig push notifications are not supported on web');
  }

  async getInitialNotification(): Promise<NotificationEvent | null> {
    return null;
  }
}
