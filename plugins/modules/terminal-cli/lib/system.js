/**
 * '@lilos/system' for the Terminal's shell in the command lilos (build.json): there is no page of
 * lilOS here, so the commands that open apps and files say so, and the apps' own commands
 * (contributes.shell) are not offered. As src/terminal/kernel/system.js, with the command's words.
 */
import { t } from './strings.js';

const noPage = () => { throw new Error(t('cli.needsUi')); };

export const installedApps = () => [];
export const getApp = () => null;
export const isInstalled = () => false;
export const launch = noPage;
export const openFile = noPage;
export async function callEntrypoint() { noPage(); }
