// Example of a local app (sdk 2): each entry point is an exported function. It reaches lilOS only
// through `lilos`, isolated (in a sandbox) or not (in lilOS's page), the same code either way.
const DIR = '~/Documenti/Note';

const STYLE = `
  .note { display: flex; height: 100%; }
  nav { width: 170px; border-right: 1px solid var(--border); background: var(--side); overflow: auto; padding: 6px; }
  nav button { display: block; width: 100%; text-align: left; padding: 5px 8px; border: 0; border-radius: 4px; background: none; color: inherit; font: inherit; cursor: pointer; }
  nav button.on, nav button:hover { background: var(--hover); }
  main { flex: 1; display: flex; flex-direction: column; }
  textarea { flex: 1; border: 0; outline: 0; resize: none; padding: 12px; background: var(--surface); color: var(--text); font: 13px/1.5 var(--font); }
  footer { padding: 6px 10px; border-top: 1px solid var(--border); color: var(--dim); font-size: 12px; }
`;

/** The window the user opens. `root`: where to draw (a Shadow DOM, or the sandbox's body). */
export async function main({ lilos, root }) {
  const { files, ui, window: win } = lilos;
  const style = document.createElement('style');
  style.textContent = STYLE;
  const box = document.createElement('div');
  box.className = 'note';
  const nav = document.createElement('nav');
  const panel = document.createElement('main');
  const text = document.createElement('textarea');
  const status = document.createElement('footer');
  panel.append(text, status);
  box.append(nav, panel);
  root.append(style, box);

  let current = null;

  async function refresh() {
    const list = (await files.list(DIR)).filter(f => f.type === 'file');
    nav.replaceChildren(...list.map(f => {
      const b = document.createElement('button');
      b.textContent = f.name;   // never innerHTML with names
      b.className = f.name === current ? 'on' : '';
      b.onclick = () => open(f.name);
      return b;
    }));
  }

  async function open(name) {
    current = name;
    text.value = await files.read(`${DIR}/${name}`);
    // The background entry point counts the words of every note
    const { notes, words } = await lilos.app.call('stats');
    status.textContent = `${name} · ${notes} note, ${words} parole in tutto`;
    win.setTitle(`Note — ${name}`);
    refresh();
  }

  async function save() {
    if (!current) return;
    await files.write(`${DIR}/${current}`, text.value);
    ui.toast(`Salvata: ${current}`);
  }

  const off = lilos.on('command', id => { if (id === 'esempio.note.save') save(); });
  await refresh();
  nav.querySelector('button')?.click();
  return off;   // called when the window closes
}

/** Background entry point: no window; answers the calls of the app (and of whoever may call it). */
export function stats({ lilos }) {
  lilos.handle(async () => {
    const list = (await lilos.files.list(DIR)).filter(f => f.type === 'file');
    let words = 0;
    for (const f of list) words += (await lilos.files.read(`${DIR}/${f.name}`)).split(/\s+/).filter(Boolean).length;
    return { notes: list.length, words };
  });
}
