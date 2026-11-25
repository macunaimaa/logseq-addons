const FORMATS = {
  agent: "Bloco para agente (nome + arquivo + link)",
  path: "Caminho absoluto do arquivo .md",
  url: "URL logseq://",
  wikilink: "[[Nome da página]]",
};

const settingsSchema = [
  {
    key: "format",
    type: "enum",
    title: "O que copiar",
    description: "Formato copiado ao clicar no botão.",
    enumChoices: Object.keys(FORMATS),
    enumPicker: "select",
    default: "agent",
  },
];

async function todayJournal() {
  const d = new Date();
  const day = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  const rows = await logseq.DB.datascriptQuery(
    `[:find (pull ?p [*]) :where [?p :block/journal-day ${day}]]`
  );
  const id = rows?.[0]?.[0]?.id;
  return id ? logseq.Editor.getPage(id) : null;
}

async function resolveCurrentPage() {
  // Editing a block: use the page that block lives on.
  const block = await logseq.Editor.getCurrentBlock();
  if (block?.page?.id) return logseq.Editor.getPage(block.page.id);
  const current = await logseq.Editor.getCurrentPage();
  // Journals home view has no "current page": fall back to today's journal.
  if (!current) return todayJournal();
  // Zoomed into a block: current is a block, walk to its page.
  if (current.page && !current.name) {
    return logseq.Editor.getPage(current.page.id);
  }
  return current;
}

async function filePathFor(page, graph) {
  const rows = await logseq.DB.datascriptQuery(
    `[:find ?path :where [?p :block/name "${page.name.replace(/"/g, '\\"')}"] [?p :block/file ?f] [?f :file/path ?path]]`
  );
  const rel = rows?.[0]?.[0];
  if (!rel) return null;
  if (rel.startsWith("/") || /^[A-Za-z]:[\\/]/.test(rel)) return rel;
  return graph?.path ? `${graph.path.replace(/[\\/]$/, "")}/${rel}` : rel;
}

function logseqUrl(graph, page) {
  const name = graph?.name ?? "";
  return `logseq://graph/${encodeURIComponent(name)}?page=${encodeURIComponent(page.originalName ?? page.name)}`;
}

async function buildText(page) {
  const graph = await logseq.App.getCurrentGraph();
  const title = page.originalName ?? page.name;
  const url = logseqUrl(graph, page);
  const path = await filePathFor(page, graph);
  switch (logseq.settings?.format ?? "agent") {
    case "path":
      return path ?? url;
    case "url":
      return url;
    case "wikilink":
      return `[[${title}]]`;
    default:
      return [
        `Nota do Logseq: ${title}`,
        path ? `Arquivo: ${path}` : null,
        `Link: ${url}`,
      ].filter(Boolean).join("\n");
  }
}

async function writeClipboard(text) {
  for (const nav of [navigator, top?.navigator]) {
    try {
      await nav.clipboard.writeText(text);
      return;
    } catch {}
  }
  const doc = top?.document ?? document;
  const ta = doc.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  doc.body.appendChild(ta);
  ta.select();
  const ok = doc.execCommand("copy");
  ta.remove();
  if (!ok) throw new Error("clipboard indisponível");
}

async function copyNoteLink() {
  const page = await resolveCurrentPage();
  if (!page) {
    logseq.UI.showMsg("Abra uma página para copiar o link.", "warning");
    return;
  }
  try {
    await writeClipboard(await buildText(page));
    logseq.UI.showMsg(`Link de "${page.originalName ?? page.name}" copiado`, "success");
  } catch (e) {
    logseq.UI.showMsg(`Falha ao copiar: ${e.message}`, "error");
  }
}

function main() {
  logseq.useSettingsSchema(settingsSchema);
  logseq.provideModel({ copyNoteLink });
  logseq.provideStyle(`
    .copy-note-link-btn { display:flex; align-items:center; justify-content:center; }
    .copy-note-link-btn svg { width:18px; height:18px; }
  `);
  logseq.App.registerUIItem("toolbar", {
    key: "copy-note-link",
    template: `
      <a class="button copy-note-link-btn" data-on-click="copyNoteLink" title="Copiar link da nota para agente">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
      </a>`,
  });
  logseq.App.registerCommandPalette(
    { key: "copy-note-link", label: "Copiar link da nota para agente" },
    copyNoteLink
  );
}

logseq.ready(main).catch(console.error);
