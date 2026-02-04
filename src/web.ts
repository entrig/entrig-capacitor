import { WebPlugin } from '@capacitor/core';

import type { EntrigPlugin } from './definitions';

export class EntrigWeb extends WebPlugin implements EntrigPlugin {
  async echo(options: { value: string }): Promise<{ value: string }> {
    console.log('ECHO', options);
    return options;
  }
}
