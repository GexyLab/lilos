import { appI18n } from '../shared/i18n.js';
import table from './locales.json';
export const i18n = appI18n('terminal', table);
export const { t } = i18n;
