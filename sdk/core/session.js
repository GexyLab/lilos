import { kernel } from './kernel.js';

/** Current user (the one signed in to the kernel) and locale. */
export const session = {
  get user() {
    return kernel.user ? { name: kernel.user.name, username: kernel.user.username } : { name: 'Utente' };
  },
  locale: 'it-IT',
};

export const initials = name => name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
