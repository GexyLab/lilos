/** Current user and locale. Placeholder until there is a real login. */
export const session = {
  user: { name: 'Eugenio' },
  locale: 'it-IT',
};

export const initials = name => name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
