/**
 * '@lilos/system' for the Terminal's shell in the kernel: nothing of lilOS's page is there, so
 * the commands that open apps and files say so instead of doing it, and the apps' own commands
 * (contributes.shell) are not offered.
 */
import { NO_PAGE } from './sdk.js';

export const installedApps = () => [];
export const getApp = () => null;
export const isInstalled = () => false;
export function launch() { throw new Error(NO_PAGE); }
export function openFile() { throw new Error(NO_PAGE); }
export async function callEntrypoint() { throw new Error(NO_PAGE); }
