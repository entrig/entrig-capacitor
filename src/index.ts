import { registerPlugin } from '@capacitor/core';

import type { EntrigPlugin } from './definitions';

const Entrig = registerPlugin<EntrigPlugin>('Entrig', {
  web: () => import('./web').then((m) => new m.EntrigWeb()),
});

export * from './definitions';
export { Entrig };
