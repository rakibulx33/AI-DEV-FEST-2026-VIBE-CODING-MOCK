export class ValidationError extends Error {
  constructor(code, values = {}) {
    super(code);
    this.name = "ValidationError";
    this.code = code;
    this.values = values;
  }
}

const fail = (code, values) => { throw new ValidationError(code, values); };
const isObject = value => value !== null && typeof value === "object" && !Array.isArray(value);
const nonEmpty = value => typeof value === "string" && value.trim().length > 0;

export function validateBuilding(input) {
  if (!isObject(input)) fail("invalidRoot");
  if (!nonEmpty(input.building)) fail("buildingName");
  if (!Array.isArray(input.nodes) || input.nodes.length < 2 || input.nodes.length > 60) fail("nodeCount");
  if (!Array.isArray(input.edges) || input.edges.length < 1 || input.edges.length > 150) fail("edgeCount");

  const nodeIds = new Set();
  const nodeTypes = new Map();
  for (const [index, node] of input.nodes.entries()) {
    if (!isObject(node) || !nonEmpty(node.id) || !nonEmpty(node.label) ||
        !["room", "junction", "exit"].includes(node.type) ||
        typeof node.x !== "number" || !Number.isFinite(node.x) ||
        typeof node.y !== "number" || !Number.isFinite(node.y)) {
      fail("invalidNode", { item: index + 1 });
    }
    if (nodeIds.has(node.id)) fail("duplicateNode", { id: node.id });
    nodeIds.add(node.id);
    nodeTypes.set(node.id, node.type);
  }
  if (![...nodeTypes.values()].some(type => type !== "exit") ||
      ![...nodeTypes.values()].some(type => type === "exit")) fail("nodeTypes");

  const edgeIds = new Set();
  const pairs = new Set();
  for (const [index, edge] of input.edges.entries()) {
    if (!isObject(edge) || !nonEmpty(edge.id) || !nonEmpty(edge.from) ||
        !nonEmpty(edge.to) || !Number.isSafeInteger(edge.cost) || edge.cost <= 0) {
      fail("invalidEdge", { item: index + 1 });
    }
    if (edgeIds.has(edge.id)) fail("duplicateEdge", { id: edge.id });
    if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) fail("edgeEndpoint", { id: edge.id });
    if (edge.from === edge.to) fail("selfLoop", { id: edge.id });
    const pair = JSON.stringify([edge.from, edge.to].sort(compareIds));
    if (pairs.has(pair)) fail("duplicatePair", { id: edge.id });
    pairs.add(pair);
    edgeIds.add(edge.id);
  }

  const state = input.initial_state;
  if (!isObject(state) || !Array.isArray(state.blocked_nodes) ||
      !Array.isArray(state.blocked_edges) || !Array.isArray(state.closed_exits)) fail("invalidState");
  for (const id of state.blocked_nodes) {
    if (typeof id !== "string" || !nodeIds.has(id) || nodeTypes.get(id) === "exit") fail("blockedNodeId", { id: String(id) });
  }
  for (const id of state.blocked_edges) {
    if (typeof id !== "string" || !edgeIds.has(id)) fail("blockedEdgeId", { id: String(id) });
  }
  for (const id of state.closed_exits) {
    if (typeof id !== "string" || nodeTypes.get(id) !== "exit") fail("closedExitId", { id: String(id) });
  }

  return {
    building: input.building,
    nodes: input.nodes.map(({ id, label, type, x, y }) => ({ id, label, type, x, y })),
    edges: input.edges.map(({ id, from, to, cost }) => ({ id, from, to, cost })),
    initial_state: {
      blocked_nodes: [...new Set(state.blocked_nodes)],
      blocked_edges: [...new Set(state.blocked_edges)],
      closed_exits: [...new Set(state.closed_exits)]
    }
  };
}

export function createState(initial) {
  return {
    blockedNodes: new Set(initial.blocked_nodes),
    blockedEdges: new Set(initial.blocked_edges),
    closedExits: new Set(initial.closed_exits)
  };
}

export function compareIds(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function comparePaths(a, b) {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    const order = compareIds(a[i], b[i]);
    if (order) return order;
  }
  return a.length - b.length;
}

function compareCandidate(a, b) {
  return a.cost - b.cost || comparePaths(a.path, b.path);
}

export function findBestRoute(graph, startId, state) {
  if (!startId) return { status: "chooseStart" };
  const start = graph.nodes.find(node => node.id === startId);
  if (!start || start.type === "exit") return { status: "chooseStart" };
  if (state.blockedNodes.has(startId)) return { status: "blockedStart" };

  const adjacency = new Map(graph.nodes.map(node => [node.id, []]));
  for (const edge of graph.edges) {
    if (state.blockedEdges.has(edge.id) || state.blockedNodes.has(edge.from) ||
        state.blockedNodes.has(edge.to) || state.closedExits.has(edge.from) ||
        state.closedExits.has(edge.to)) continue;
    adjacency.get(edge.from).push({ to: edge.to, cost: edge.cost });
    adjacency.get(edge.to).push({ to: edge.from, cost: edge.cost });
  }

  const initial = { cost: 0, path: [startId] };
  const best = new Map([[startId, initial]]);
  const queue = [{ id: startId, ...initial }];
  while (queue.length) {
    queue.sort(compareCandidate);
    const current = queue.shift();
    if (best.get(current.id).path !== current.path) continue;
    for (const edge of adjacency.get(current.id)) {
      const candidate = { cost: current.cost + edge.cost, path: [...current.path, edge.to] };
      const previous = best.get(edge.to);
      if (!previous || compareCandidate(candidate, previous) < 0) {
        best.set(edge.to, candidate);
        queue.push({ id: edge.to, ...candidate });
      }
    }
  }

  const exits = graph.nodes.filter(node => node.type === "exit" && !state.closedExits.has(node.id))
    .map(node => ({ exitId: node.id, ...best.get(node.id) }))
    .filter(item => item.path)
    .sort((a, b) => a.cost - b.cost || compareIds(a.exitId, b.exitId) || comparePaths(a.path, b.path));

  return exits.length ? { status: "route", ...exits[0] } : { status: "noRoute" };
}
