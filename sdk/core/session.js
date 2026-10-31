import { kernel } from './kernel.js';
import { locale } from './locale.js';

/** Current user (the one signed in to the kernel) and locale (locale.code: the 'language' setting). */
export const session = {
  get user() {
    return kernel.user ? { name: kernel.user.name, username: kernel.user.username } : { name: 'Utente' };
  },
  get locale() {
    return locale.code;
  },
};

export const initials = name => name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
