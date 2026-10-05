import { validateBuilding, createState, findBestRoute, ValidationError, compareIds } from "./graph.js";
import { demoBuilding } from "./demo.js";

export const words = {
  en: {
    simulationTag: "INTERACTIVE SIMULATION", eyebrow: "EVACUATION ROUTE SIMULATOR",
    headline: "Find the safest way <em>out.</em>",
    intro: "Explore a building, change its hazards, and watch the lowest-cost escape route update instantly.",
    setupHeading: "Set up", setupCaption: "Import a building map or explore the practice layout.",
    importButton: "Import building.json", demoButton: "Load practice map", startHeading: "Starting location",
    startHelp: "Choose an available room or junction.", hazardHeading: "Change conditions",
    hazardHelp: "Switch to edit mode and click the map, or use the controls below.",
    selectMode: "Choose start", editMode: "Edit hazards", locationsTab: "Locations", corridorsTab: "Corridors",
    exitsTab: "Exits", resetButton: "Reset to initial state", mapOverline: "LIVE BUILDING MAP",
    mapDescription: "Select a start or edit hazards on the map. The highlighted route leads to the lowest-cost open exit.",
    room: "Room", junction: "Junction", exit: "Exit", route: "Route", unavailable: "Unavailable",
    mapHintSelect: "Tap a location to choose your start", mapHintEdit: "Tap a location or corridor to change its state",
    routeHeading: "Your escape route", costNote: "Routes use corridor costs, not visual distance. The least-cost reachable open exit wins.",
    safetyNote: "Educational simulation only. Not for real-world evacuation decisions.",
    footer: "Built for the AI DevFest practice challenge", practiceBadge: "PRACTICE MAP", importedBadge: "IMPORTED FILE",
    chooseOption: "Choose a starting location", selectedExit: "OPEN EXIT", totalCost: "TOTAL COST", from: "FROM", to: "TO",
    routePath: "ROUTE SEQUENCE", routeReady: "LOWEST-COST ROUTE", costUnit: "cost", steps: "corridors",
    chooseTitle: "Choose a starting location", chooseText: "Select an available room or junction to calculate an escape route.",
    blockedTitle: "Starting location blocked", blockedText: "Unblock this location or choose another available starting point.",
    noRouteTitle: "No route available", noRouteText: "No open exit can be reached under the current conditions.",
    block: "Block", unblock: "Unblock", close: "Close", reopen: "Reopen", blocked: "BLOCKED", closed: "CLOSED",
    open: "Open", available: "Available", fileLoaded: "Building file imported successfully.",
    demoLoaded: "Practice map loaded.", resetDone: "Initial hazard state restored.", invalidJson: "The file is not valid JSON.",
    fileRead: "Could not read this file. Please try another JSON file.",
    invalidRoot: "The JSON must contain a building object.", buildingName: "The building name must be a non-empty string.",
    nodeCount: "Provide between 2 and 60 nodes.", edgeCount: "Provide between 1 and 150 edges.",
    invalidNode: "Node {item} needs a unique ID, label, valid type, and numeric x/y coordinates.",
    duplicateNode: "Duplicate node ID: {id}.", nodeTypes: "Include at least one exit and one room or junction.",
    invalidEdge: "Edge {item} needs an ID, endpoints, and a positive integer cost.",
    duplicateEdge: "Duplicate edge ID: {id}.", edgeEndpoint: "Edge {id} refers to an unknown node.",
    selfLoop: "Edge {id} cannot connect a node to itself.", duplicatePair: "Edge {id} repeats a corridor between two nodes.",
    invalidState: "initial_state must contain blocked_nodes, blocked_edges, and closed_exits arrays.",
    blockedNodeId: "blocked_nodes contains an unknown ID or an exit: {id}.",
    blockedEdgeId: "blocked_edges contains an unknown edge ID: {id}.",
    closedExitId: "closed_exits contains an unknown ID or a non-exit: {id}."
  },
  bn: {
    simulationTag: "ইন্টারঅ্যাকটিভ সিমুলেশন", eyebrow: "জরুরি বহির্গমন পথ সিমুলেটর",
    headline: "নিরাপদ পথটি <em>খুঁজে নিন।</em>",
    intro: "ভবনের মানচিত্র দেখুন, বাধা পরিবর্তন করুন এবং সর্বনিম্ন খরচের বহির্গমন পথ সঙ্গে সঙ্গে দেখুন।",
    setupHeading: "শুরু করুন", setupCaption: "ভবনের মানচিত্র আমদানি করুন অথবা অনুশীলনের মানচিত্র দেখুন।",
    importButton: "building.json আমদানি করুন", demoButton: "অনুশীলনের মানচিত্র খুলুন", startHeading: "শুরুর স্থান",
    startHelp: "চলাচলযোগ্য কক্ষ বা সংযোগস্থল বেছে নিন।", hazardHeading: "অবস্থা পরিবর্তন করুন",
    hazardHelp: "সম্পাদনা মোডে মানচিত্রে চাপ দিন অথবা নিচের নিয়ন্ত্রণ ব্যবহার করুন।",
    selectMode: "শুরুর স্থান বাছুন", editMode: "বাধা সম্পাদনা", locationsTab: "স্থান", corridorsTab: "পথ",
    exitsTab: "বহির্গমন", resetButton: "প্রাথমিক অবস্থায় ফিরুন", mapOverline: "ভবনের বর্তমান মানচিত্র",
    mapDescription: "শুরুর স্থান বাছুন অথবা মানচিত্রে বাধা পরিবর্তন করুন। চিহ্নিত পথটি সর্বনিম্ন খরচে খোলা বহির্গমনে যায়।",
    room: "কক্ষ", junction: "সংযোগস্থল", exit: "বহির্গমন", route: "পথ", unavailable: "বন্ধ",
    mapHintSelect: "শুরুর স্থান বাছতে কোনো স্থানে চাপ দিন", mapHintEdit: "অবস্থা বদলাতে স্থান বা পথে চাপ দিন",
    routeHeading: "আপনার বহির্গমন পথ", costNote: "পথের খরচ করিডরের মান দিয়ে হিসাব করা হয়, মানচিত্রের দূরত্ব দিয়ে নয়।",
    safetyNote: "শুধু শিক্ষামূলক সিমুলেশন। বাস্তব জরুরি সিদ্ধান্তে ব্যবহার করবেন না।",
    footer: "AI DevFest অনুশীলন চ্যালেঞ্জের জন্য তৈরি", practiceBadge: "অনুশীলনের মানচিত্র", importedBadge: "আমদানিকৃত ফাইল",
    chooseOption: "শুরুর স্থান বেছে নিন", selectedExit: "খোলা বহির্গমন", totalCost: "মোট খরচ", from: "শুরু", to: "গন্তব্য",
    routePath: "পথের ক্রম", routeReady: "সর্বনিম্ন খরচের পথ", costUnit: "খরচ", steps: "করিডর",
    chooseTitle: "শুরুর স্থান বেছে নিন", chooseText: "পথ হিসাব করতে চলাচলযোগ্য কক্ষ বা সংযোগস্থল বেছে নিন।",
    blockedTitle: "শুরুর স্থান বন্ধ", blockedText: "এই স্থানটি খুলুন অথবা অন্য শুরুর স্থান বেছে নিন।",
    noRouteTitle: "কোনো পথ পাওয়া যায়নি", noRouteText: "বর্তমান অবস্থায় কোনো খোলা বহির্গমনে পৌঁছানো যাচ্ছে না।",
    block: "বন্ধ করুন", unblock: "খুলুন", close: "বন্ধ করুন", reopen: "খুলুন", blocked: "বন্ধ", closed: "বন্ধ",
    open: "খোলা", available: "চলাচলযোগ্য", fileLoaded: "ভবনের ফাইল সফলভাবে আমদানি হয়েছে।",
    demoLoaded: "অনুশীলনের মানচিত্র খোলা হয়েছে।", resetDone: "প্রাথমিক বাধার অবস্থা ফিরিয়ে আনা হয়েছে।", invalidJson: "ফাইলটি সঠিক JSON নয়।",
    fileRead: "ফাইলটি পড়া যায়নি। অন্য JSON ফাইল চেষ্টা করুন।",
    invalidRoot: "JSON ফাইলে একটি building অবজেক্ট থাকতে হবে।", buildingName: "ভবনের নাম খালি রাখা যাবে না।",
    nodeCount: "২ থেকে ৬০টি নোড দিন।", edgeCount: "১ থেকে ১৫০টি করিডর দিন।",
    invalidNode: "নোড {item}-এ ID, নাম, সঠিক ধরন এবং সংখ্যাসূচক x/y স্থানাঙ্ক প্রয়োজন।",
    duplicateNode: "একই নোড ID একাধিকবার আছে: {id}।", nodeTypes: "অন্তত একটি বহির্গমন এবং একটি কক্ষ বা সংযোগস্থল থাকতে হবে।",
    invalidEdge: "করিডর {item}-এ ID, দুই প্রান্ত এবং ধনাত্মক পূর্ণসংখ্যা খরচ প্রয়োজন।",
    duplicateEdge: "একই করিডর ID একাধিকবার আছে: {id}।", edgeEndpoint: "করিডর {id} অজানা নোড উল্লেখ করছে।",
    selfLoop: "করিডর {id} একই নোডে শুরু ও শেষ হতে পারে না।", duplicatePair: "করিডর {id} একই দুই নোডের সংযোগ পুনরায় দিয়েছে।",
    invalidState: "initial_state-এ blocked_nodes, blocked_edges এবং closed_exits অ্যারে থাকতে হবে।",
    blockedNodeId: "blocked_nodes-এ অজানা ID বা বহির্গমন আছে: {id}।",
    blockedEdgeId: "blocked_edges-এ অজানা করিডর ID আছে: {id}।",
    closedExitId: "closed_exits-এ অজানা ID বা বহির্গমন নয় এমন নোড আছে: {id}।"
  }
};

const $ = id => document.getElementById(id);
const svgNS = "http://www.w3.org/2000/svg";
const app = {
  language: readLanguage(), graph: validateBuilding(demoBuilding), source: "practice",
  hazards: createState(demoBuilding.initial_state), startId: "R1", mode: "select", tab: "locations", notice: null
};

function readLanguage() {
  try { return localStorage.getItem("smart-escape-language") === "bn" ? "bn" : "en"; }
  catch { return "en"; }
}
function t(key, values = {}) {
  return (words[app.language][key] ?? words.en[key] ?? key).replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? ""));
}
function element(tag, className, content) {
  const item = document.createElement(tag);
  if (className) item.className = className;
  if (content !== undefined) item.textContent = content;
  return item;
}
function svg(tag, attrs = {}, content) {
  const item = document.createElementNS(svgNS, tag);
  for (const [name, value] of Object.entries(attrs)) item.setAttribute(name, String(value));
  if (content !== undefined) item.textContent = content;
  return item;
}
function labelFor(node) { return `${node.id} · ${node.label}`; }
function setNotice(key, values = {}, error = false) { app.notice = { key, values, error }; renderNotice(); }
function renderNotice() {
  const item = $("notice");
  item.hidden = !app.notice;
  if (app.notice) {
    item.className = `notice${app.notice.error ? " error" : ""}`;
    item.textContent = t(app.notice.key, app.notice.values);
  }
}
function setLanguage(language) {
  app.language = language;
  try { localStorage.setItem("smart-escape-language", language); } catch { /* Storage is optional. */ }
  render();
}
function selectStart(id) {
  if (id && app.hazards.blockedNodes.has(id)) return;
  app.startId = id || null;
  app.notice = null;
  render();
}
function toggleHazard(kind, id) {
  const set = kind === "node" ? app.hazards.blockedNodes : kind === "edge" ? app.hazards.blockedEdges : app.hazards.closedExits;
  if (set.has(id)) set.delete(id); else set.add(id);
  app.notice = null;
  render();
}
function resetHazards() {
  app.hazards = createState(app.graph.initial_state);
  setNotice("resetDone");
  render();
}
function loadBuilding(value, source) {
  app.graph = validateBuilding(value);
  app.hazards = createState(app.graph.initial_state);
  app.startId = source === "practice" ? "R1" : null;
  app.source = source;
  app.mode = "select";
  setNotice(source === "practice" ? "demoLoaded" : "fileLoaded");
  render();
}
function renderStaticText() {
  document.documentElement.lang = app.language;
  document.querySelectorAll("[data-i18n]").forEach(item => {
    const key = item.dataset.i18n;
    if (key === "headline") {
      item.replaceChildren(document.createTextNode(app.language === "bn" ? "নিরাপদ পথটি " : "Find the safest way "), element("em", "", app.language === "bn" ? "খুঁজে নিন।" : "out."));
    } else item.textContent = t(key);
  });
  $("lang-en").classList.toggle("active", app.language === "en");
  $("lang-bn").classList.toggle("active", app.language === "bn");
  $("lang-en").setAttribute("aria-pressed", String(app.language === "en"));
  $("lang-bn").setAttribute("aria-pressed", String(app.language === "bn"));
  $("map-title").textContent = app.graph.building;
  $("source-badge").textContent = t(app.source === "practice" ? "practiceBadge" : "importedBadge");
  $("source-badge").classList.toggle("imported", app.source !== "practice");
  $("map-hint").textContent = t(app.mode === "select" ? "mapHintSelect" : "mapHintEdit");
  $("start-select").setAttribute("aria-label", t("startHeading"));
  $("mode-select").classList.toggle("active", app.mode === "select");
  $("mode-edit").classList.toggle("active", app.mode === "edit");
  $("mode-select").setAttribute("aria-pressed", String(app.mode === "select"));
  $("mode-edit").setAttribute("aria-pressed", String(app.mode === "edit"));
  for (const tab of ["locations", "corridors", "exits"]) {
    const button = $(`tab-${tab}`);
    button.classList.toggle("active", app.tab === tab);
    button.setAttribute("aria-selected", String(app.tab === tab));
  }
}
function renderStartOptions() {
  const control = $("start-select");
  const placeholder = element("option", "", t("chooseOption"));
  placeholder.value = "";
  control.replaceChildren(placeholder);
  for (const node of app.graph.nodes.filter(item => item.type !== "exit").sort((a, b) => compareIds(a.id, b.id))) {
    const option = element("option", "", labelFor(node));
    option.value = node.id;
    option.disabled = app.hazards.blockedNodes.has(node.id) && node.id !== app.startId;
    control.append(option);
  }
  control.value = app.startId ?? "";
}
function renderHazards() {
  const list = $("hazard-list");
  list.replaceChildren();
  let items;
  if (app.tab === "locations") items = app.graph.nodes.filter(item => item.type !== "exit").sort((a, b) => compareIds(a.id, b.id));
  else if (app.tab === "exits") items = app.graph.nodes.filter(item => item.type === "exit").sort((a, b) => compareIds(a.id, b.id));
  else items = [...app.graph.edges].sort((a, b) => compareIds(a.id, b.id));
  for (const item of items) {
    const kind = app.tab === "locations" ? "node" : app.tab === "exits" ? "exit" : "edge";
    const active = kind === "node" ? app.hazards.blockedNodes.has(item.id) : kind === "edge" ? app.hazards.blockedEdges.has(item.id) : app.hazards.closedExits.has(item.id);
    const row = element("div", "hazard-row");
    const details = element("div");
    details.append(element("strong", "", kind === "edge" ? `${item.from} ↔ ${item.to}` : labelFor(item)));
    details.append(element("small", "", kind === "edge" ? `${item.id} · ${t("costUnit")} ${item.cost}` : t(item.type)));
    const button = element("button", active ? "active" : "", t(kind === "exit" ? (active ? "reopen" : "close") : (active ? "unblock" : "block")));
    button.type = "button";
    button.setAttribute("aria-pressed", String(active));
    button.setAttribute("aria-label", `${button.textContent} ${kind === "edge" ? `${item.from} ${item.to}` : labelFor(item)}`);
    button.addEventListener("click", () => toggleHazard(kind, item.id));
    row.append(details, button);
    list.append(row);
  }
}
function addText(group, className, x, y, content) {
  group.append(svg("text", { class: className, x, y }, content));
}
function makeInteractive(group, label, action) {
  group.setAttribute("tabindex", "0");
  group.setAttribute("role", "button");
  group.setAttribute("aria-label", label);
  group.addEventListener("click", action);
  group.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") { event.preventDefault(); action(); }
  });
}
function renderMap(route) {
  const map = $("building-map");
  map.replaceChildren();
  const xs = app.graph.nodes.map(node => node.x), ys = app.graph.nodes.map(node => node.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const position = new Map(app.graph.nodes.map(node => [node.id, {
    x: maxX === minX ? 500 : 105 + (node.x - minX) / (maxX - minX) * 790,
    y: maxY === minY ? 310 : 115 + (node.y - minY) / (maxY - minY) * 390
  }]));
  const pathPairs = new Set();
  if (route.status === "route") for (let i = 0; i < route.path.length - 1; i++) pathPairs.add(JSON.stringify([route.path[i], route.path[i + 1]].sort(compareIds)));

  const edges = svg("g", { class: "edges" });
  for (const edge of app.graph.edges) {
    const a = position.get(edge.from), b = position.get(edge.to);
    const blocked = app.hazards.blockedEdges.has(edge.id);
    const disabled = app.hazards.blockedNodes.has(edge.from) || app.hazards.blockedNodes.has(edge.to) ||
      app.hazards.closedExits.has(edge.from) || app.hazards.closedExits.has(edge.to);
    const onRoute = pathPairs.has(JSON.stringify([edge.from, edge.to].sort(compareIds)));
    const group = svg("g", { class: `map-edge${onRoute ? " is-route" : ""}${blocked ? " is-blocked" : ""}${disabled ? " is-disabled" : ""}` });
    group.append(svg("line", { class: "edge-line", x1: a.x, y1: a.y, x2: b.x, y2: b.y }));
    group.append(svg("line", { class: "edge-hit", x1: a.x, y1: a.y, x2: b.x, y2: b.y }));
    const middle = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    group.append(svg("rect", { class: "cost-bg", x: middle.x - 19, y: middle.y - 15, width: 38, height: 30, rx: 8 }));
    addText(group, "cost-text", middle.x, middle.y + 1, edge.cost);
    makeInteractive(group, `${edge.from} ${edge.to}, ${t("costUnit")} ${edge.cost}, ${blocked ? t("blocked") : t("open")}`, () => {
      if (app.mode === "edit") toggleHazard("edge", edge.id);
    });
    edges.append(group);
  }
  map.append(edges);

  const nodes = svg("g", { class: "nodes" });
  for (const node of app.graph.nodes) {
    const p = position.get(node.id);
    const blocked = app.hazards.blockedNodes.has(node.id);
    const closed = app.hazards.closedExits.has(node.id);
    const onRoute = route.status === "route" && route.path.includes(node.id);
    const isStart = app.startId === node.id;
    const isTarget = route.status === "route" && route.exitId === node.id;
    const group = svg("g", { class: `map-node ${node.type}${onRoute ? " is-route" : ""}${isStart ? " is-start" : ""}${isTarget ? " is-target" : ""}${blocked ? " is-blocked" : ""}${closed ? " is-closed" : ""}` });
    group.append(svg("circle", { class: "node-pulse", cx: p.x, cy: p.y, r: 31 }));
    group.append(svg("circle", { class: "node-ring", cx: p.x, cy: p.y, r: 31 }));
    group.append(svg("circle", { class: "node-hit", cx: p.x, cy: p.y, r: 44 }));
    addText(group, "node-id", p.x, p.y + 1, node.id);
    addText(group, "node-label", p.x, p.y + 57, node.label);
    if (blocked || closed) addText(group, "node-status", p.x, p.y - 45, t(blocked ? "blocked" : "closed"));
    makeInteractive(group, `${labelFor(node)}, ${t(node.type)}, ${blocked ? t("blocked") : closed ? t("closed") : t("available")}`, () => {
      if (app.mode === "edit") toggleHazard(node.type === "exit" ? "exit" : "node", node.id);
      else if (node.type !== "exit") selectStart(node.id);
    });
    nodes.append(group);
  }
  map.append(nodes);
}
function renderRoute(route) {
  const host = $("route-result");
  host.replaceChildren();
  if (route.status !== "route") {
    const box = element("div", `route-empty${route.status === "chooseStart" ? "" : " danger"}`);
    box.append(element("div", "empty-icon", route.status === "chooseStart" ? "⌖" : "!"));
    box.append(element("h3", "", t(route.status === "chooseStart" ? "chooseTitle" : route.status === "blockedStart" ? "blockedTitle" : "noRouteTitle")));
    box.append(element("p", "", t(route.status === "chooseStart" ? "chooseText" : route.status === "blockedStart" ? "blockedText" : "noRouteText")));
    host.append(box);
    return;
  }
  const box = element("div", "route-success");
  box.append(element("div", "route-kicker", t("routeReady")));
  const cost = element("div", "route-cost");
  cost.append(element("strong", "", new Intl.NumberFormat(app.language === "bn" ? "bn-BD" : "en-US").format(route.cost)));
  cost.append(element("span", "", t("costUnit")));
  box.append(cost, element("hr", "result-rule"));
  for (const [key, value] of [["from", app.startId], ["to", route.exitId], ["steps", String(route.path.length - 1)]]) {
    const pair = element("div", "result-pair");
    pair.append(element("span", "", t(key)), element("strong", "", value));
    box.append(pair);
  }
  box.append(element("div", "path-label", t("routePath")));
  const path = element("div", "path-list");
  route.path.forEach((id, index) => {
    if (index) path.append(element("b", "", "→"));
    path.append(element("span", "", id));
  });
  box.append(path);
  host.append(box);
}
function render() {
  const route = findBestRoute(app.graph, app.startId, app.hazards);
  renderStaticText();
  renderNotice();
  renderStartOptions();
  renderHazards();
  renderMap(route);
  renderRoute(route);
}

$("lang-en").addEventListener("click", () => setLanguage("en"));
$("lang-bn").addEventListener("click", () => setLanguage("bn"));
$("start-select").addEventListener("change", event => selectStart(event.target.value));
$("mode-select").addEventListener("click", () => { app.mode = "select"; render(); });
$("mode-edit").addEventListener("click", () => { app.mode = "edit"; render(); });
for (const tab of ["locations", "corridors", "exits"]) $("tab-" + tab).addEventListener("click", () => { app.tab = tab; render(); });
$("reset-button").addEventListener("click", resetHazards);
$("demo-button").addEventListener("click", () => loadBuilding(demoBuilding, "practice"));
$("file-input").addEventListener("change", async event => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    let value;
    try { value = JSON.parse(await file.text()); }
    catch (error) { if (error instanceof SyntaxError) throw new ValidationError("invalidJson"); else throw error; }
    loadBuilding(value, "imported");
  } catch (error) {
    if (error instanceof ValidationError) setNotice(error.code, error.values, true);
    else setNotice("fileRead", {}, true);
  }
  event.target.value = "";
});
render();
