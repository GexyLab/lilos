import { ShellError } from '../../../src/terminal/shell/signals.js';
import { t } from './strings.js';
import { confirm } from './ask.js';

/**
 * license: the license of lilOS (GET /api/license). Without UI it is accepted when the kernel
 * starts; when its text changes later, an administrator reads it and accepts it here.
 *   license            the text and whether it is accepted
 *   license status     only whether it is accepted
 *   license accept [-y]  accepts the text just shown (administrators)
 */
export const licenseCommand = {
  name: 'license',
  usage: 'license [status | accept [-y]]',
  get summary() { return t('license.summary'); },
  get help() { return t('license.help'); },
  async run(ctx) {
    const client = ctx.shell.client;
    const [sub = 'show', ...rest] = ctx.args;
    const status = await client.get('/api/license');
    const state = status.accepted
      ? t('license.accepted', { at: status.acceptedAt ? new Date(status.acceptedAt).toLocaleString() : '—' })
      : t('license.notAccepted');
    if (sub === 'status') {
      await ctx.out(`${state}\n`);
      return status.accepted ? 0 : 1;
    }
    if (sub === 'show') {
      await ctx.out(`${status.text.replace(/\n*$/, '\n')}\n${t('license.source', { url: status.url })}\n${state}\n`);
      if (!status.accepted && status.canAccept) await ctx.out(`${t('license.howToAccept')}\n`);
      return 0;
    }
    if (sub !== 'accept') throw new ShellError(t('license.usage'), 2);
    if (status.accepted) {
      await ctx.out(`${state}\n`);
      return 0;
    }
    if (!status.canAccept) throw new ShellError(t('license.adminOnly'));
    if (!rest.includes('-y')) {
      await ctx.out(`${status.text.replace(/\n*$/, '\n')}\n${t('license.source', { url: status.url })}\n`);
      if (!await confirm(ctx, t('license.confirm'), { yes: false })) return 1;
    }
    await client.post('/api/license/accept', { sha256: status.sha256 });
    await ctx.out(`${t('license.done')}\n`);
    return 0;
  },
};
