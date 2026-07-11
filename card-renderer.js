/* ==========================================================================
   BLOCK 3 — card-renderer.js
   ---------------------------------------------------------------------
   Responsibilities:
     1. Turn a single rule object (per schema in PROJECT_STRUCTURE.md §4.1)
        into the exact HTML structure/classes Block 1's CSS already styles.
     2. Turn the whole rules collection into a container of cards, sorted.
     3. Keep #card-container in sync whenever data-loader.js announces new
        data (via "riftbound:data-ready" / "riftbound:data-updated" events).

   Renders PLAIN TEXT ONLY for en/th fields (via textContent, never
   innerHTML) — keyword highlighting is intentionally NOT done here.
   Block 4 (tooltip-engine.js) scans the already-rendered DOM afterward
   and wraps keyword matches. Keeping these concerns separate means the
   raw JSON data never needs to contain markup.
   ========================================================================== */

/* ==========================================================================
   SECTION / CATEGORY BUCKETING
   Maps a rule id to the same "000/100/500/600/700" buckets Block 1's CSS
   uses for the left-border accent colors and sidebar dot colors.
   ========================================================================== */

function _sectionBucket(id) {
  const n = parseInt(id, 10);
  if (isNaN(n)) return "000";
  if (n < 100) return "000";
  if (n < 500) return "100";
  if (n < 600) return "500";
  if (n < 700) return "600";
  return "700";
}

/* ==========================================================================
   INDENT DEPTH
   "626"        → 0 segments deep  → no indent
   "626.1"      → 1 segment deep   → no indent  (top-level sub-rule)
   "626.1.d"    → 2 segments deep  → indent-1
   "626.1.d.1"  → 3+ segments deep → indent-2 (cap — CSS only defines 2 levels)
   ========================================================================== */

function _indentClass(num) {
  if (!num) return "";
  const depth = num.split(".").length - 1;
  if (depth <= 1) return "";
  if (depth === 2) return "indent-1";
  return "indent-2";
}

/* ==========================================================================
   SMALL DOM HELPERS
   ========================================================================== */

function _el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/* ==========================================================================
   RENDER ONE CONTENT ITEM  (type: rule | reminder | example)
   ========================================================================== */

function _renderContentItem(item) {
  if (item.type === "reminder" || item.type === "example") {
    const box = _el("div", `rule-box ${item.type === "reminder" ? "box-reminder" : "box-example"}`);
    box.appendChild(_el("span", "box-label", item.type === "reminder" ? "Reminder" : "Example"));
    box.appendChild(_el("p", "en", item.en || ""));
    box.appendChild(_el("p", "th", item.th || ""));
    return box;
  }

  // default: "rule"
  const indent = _indentClass(item.num);
  const line = _el("div", `rule-line${indent ? " " + indent : ""}`);
  if (item.num) line.appendChild(_el("p", "num", item.num));
  line.appendChild(_el("p", "en", item.en || ""));
  line.appendChild(_el("p", "th", item.th || ""));
  return line;
}

/* ==========================================================================
   INTERFACE CONTRACT FUNCTIONS
   ========================================================================== */

/** Renders one rule object into a .rule-card HTMLElement. */
function renderCard(rule) {
  const card = _el("article", "rule-card");
  card.dataset.section = _sectionBucket(rule.id);
  card.id = rule.id;
  card.style.scrollMarginTop = "90px";

  const badge = _el("div", "rule-card-badge", rule.id);
  card.appendChild(badge);

  const body = _el("div", "rule-card-body");

  if (rule.title_en) body.appendChild(_el("p", "rule-card-title-en", rule.title_en));
  if (rule.title_th) body.appendChild(_el("h3", "rule-card-title", rule.title_th));

  const content = Array.isArray(rule.content) ? rule.content : [];
  for (const item of content) {
    body.appendChild(_renderContentItem(item));
  }

  card.appendChild(body);
  return card;
}

/** Renders the whole rules collection into one container HTMLElement, sorted by id. */
function renderAllCards(rulesObject) {
  const container = _el("div");
  const ids = Object.keys(rulesObject || {}).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true })
  );

  for (const id of ids) {
    container.appendChild(renderCard(rulesObject[id]));
  }

  return container;
}

/* ==========================================================================
   LIVE DOM SYNC
   Keeps #card-container up to date whenever data-loader.js's state changes.
   Removes Block 1's static placeholder card the first time real data renders.
   ========================================================================== */

function _syncCardContainer() {
  const container = document.getElementById("card-container");
  const emptyState = document.getElementById("empty-state");
  if (!container) return;

  const state = typeof getState === "function" ? getState() : { rules: {} };
  const ruleCount = Object.keys(state.rules || {}).length;

  // Remove everything except the empty-state node (placeholder + any
  // previously rendered cards), then rebuild from current state.
  [...container.children].forEach((child) => {
    if (child.id !== "empty-state") child.remove();
  });

  if (ruleCount === 0) {
    if (emptyState) emptyState.hidden = false;
    return;
  }

  if (emptyState) emptyState.hidden = true;
  const rendered = renderAllCards(state.rules);
  container.appendChild(rendered);
}

document.addEventListener("DOMContentLoaded", _syncCardContainer);
document.addEventListener("riftbound:data-ready", _syncCardContainer);
document.addEventListener("riftbound:data-updated", _syncCardContainer);
