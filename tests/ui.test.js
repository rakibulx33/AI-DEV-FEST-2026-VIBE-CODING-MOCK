import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

class FakeElement {
  constructor(tag = "div") {
    this.tag = tag;
    this.children = [];
    this.attributes = {};
    this.listeners = {};
    this.className = "";
    this.dataset = {};
    this.value = "";
    this.hidden = false;
    this._text = "";
    this.classList = { toggle: (name, active) => {
      const classes = new Set(this.className.split(/\s+/).filter(Boolean));
      if (active) classes.add(name); else classes.delete(name);
      this.className = [...classes].join(" ");
    } };
  }
  set textContent(value) { this._text = String(value); this.children = []; }
  get textContent() { return this._text + this.children.map(child => child.textContent ?? "").join(""); }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name]; }
  append(...items) { this.children.push(...items); }
  replaceChildren(...items) { this.children = items; this._text = ""; }
  addEventListener(name, handler) { (this.listeners[name] ||= []).push(handler); }
  fire(name, event = {}) { for (const handler of this.listeners[name] || []) handler({ target: this, ...event }); }
}

const ids = ["notice", "lang-en", "lang-bn", "map-title", "source-badge", "map-hint", "start-select",
  "mode-select", "mode-edit", "tab-locations", "tab-corridors", "tab-exits", "hazard-list",
  "building-map", "route-result", "reset-button", "demo-button", "file-input"];
const elements = Object.fromEntries(ids.map(id => [id, new FakeElement()]));
globalThis.document = {
  documentElement: { lang: "en" },
  getElementById: id => elements[id],
  querySelectorAll: () => [],
  createElement: tag => new FakeElement(tag),
  createElementNS: (_, tag) => new FakeElement(tag),
  createTextNode: text => ({ textContent: text })
};
globalThis.localStorage = { getItem: () => null, setItem: () => {} };

function descendants(element) {
  return [element, ...element.children.flatMap(child => child instanceof FakeElement ? descendants(child) : [])];
}

test("UI recalculates on hazards, restores state, switches language, and imports files", async () => {
  const { words } = await import("../src/app.js");
  assert.deepEqual(Object.keys(words.bn).sort(), Object.keys(words.en).sort(), "both languages should cover the same UI messages");
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  for (const [, key] of html.matchAll(/data-i18n="([^"]+)"/g)) assert.ok(words.en[key], `missing translation: ${key}`);
  assert.match(elements["route-result"].textContent, /7/);
  assert.match(elements["route-result"].textContent, /E1/);

  elements["mode-edit"].fire("click");
  const c2 = descendants(elements["building-map"]).find(item => item.getAttribute("class")?.includes("map-node") && item.getAttribute("aria-label")?.startsWith("C2 ·"));
  assert.ok(c2);
  c2.fire("click");
  assert.match(elements["route-result"].textContent, /11/);
  assert.match(elements["route-result"].textContent, /E2/);

  elements["reset-button"].fire("click");
  assert.match(elements["route-result"].textContent, /7/);
  elements["start-select"].fire("change", { target: { value: "R2" } });
  assert.match(elements["route-result"].textContent, /R2→C3→C4→E2/);
  elements["start-select"].fire("change", { target: { value: "R1" } });
  elements["tab-exits"].fire("click");
  for (const id of ["E1", "E2"]) {
    const close = descendants(elements["hazard-list"]).find(item => item.tag === "button" && item.getAttribute("aria-label")?.includes(`${id} ·`));
    assert.ok(close);
    close.fire("click");
  }
  assert.match(elements["route-result"].textContent, /No route available/);
  elements["reset-button"].fire("click");
  elements["tab-locations"].fire("click");
  const blockR1 = descendants(elements["hazard-list"]).find(item => item.tag === "button" && item.getAttribute("aria-label")?.includes("R1 ·"));
  blockR1.fire("click");
  assert.match(elements["route-result"].textContent, /Starting location blocked/);

  elements["lang-bn"].fire("click");
  assert.equal(document.documentElement.lang, "bn");
  assert.match(elements["route-result"].textContent, /শুরুর স্থান বন্ধ/);

  const official = await readFile(new URL("../building.json", import.meta.url), "utf8");
  elements["file-input"].fire("change", { target: { files: [{ text: async () => official }], value: "ignored" } });
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.match(elements["source-badge"].textContent, /আমদানিকৃত/);
  assert.match(elements["route-result"].textContent, /শুরুর স্থান বেছে নিন/);

  elements["file-input"].fire("change", { target: { files: [{ text: async () => "{invalid" }], value: "ignored" } });
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(elements.notice.className, "notice error");
  assert.match(elements.notice.textContent, /সঠিক JSON নয়/);
});
