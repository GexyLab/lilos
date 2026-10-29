// Example of a local app: runs in a sandbox and reaches lilOS only through window.lilos
const DIR = '~/Documenti/Note';
const { files, ui, window: win } = lilos;

document.head.insertAdjacentHTML('beforeend', `<style>
  body { display: flex; }
  nav { width: 170px; border-right: 1px solid var(--border); background: var(--side); overflow: auto; padding: 6px; }
  nav button { display: block; width: 100%; text-align: left; padding: 5px 8px; border: 0; border-radius: 4px; background: none; color: inherit; font: inherit; cursor: pointer; }
  nav button.on, nav button:hover { background: var(--hover); }
  main { flex: 1; display: flex; flex-direction: column; }
  textarea { flex: 1; border: 0; outline: 0; resize: none; padding: 12px; background: var(--surface); color: var(--text); font: 13px/1.5 var(--font); }
  footer { padding: 6px 10px; border-top: 1px solid var(--border); color: var(--dim); font-size: 12px; }
</style>`);

const nav = document.createElement('nav');
const main = document.createElement('main');
const text = document.createElement('textarea');
const status = document.createElement('footer');
main.append(text, status);
document.body.append(nav, main);

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
  status.textContent = name;
  win.setTitle(`Note — ${name}`);
  refresh();
}

async function save() {
  if (!current) return;
  await files.write(`${DIR}/${current}`, text.value);
  ui.toast(`Salvata: ${current}`);
}

lilos.on('command', id => { if (id === 'esempio.note.save') save(); });
await refresh();
const first = nav.querySelector('button');
if (first) first.click();
