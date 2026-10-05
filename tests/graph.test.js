import test from "node:test";
import assert from "node:assert/strict";
import { validateBuilding, createState, findBestRoute, ValidationError } from "../src/graph.js";
import { demoBuilding } from "../src/demo.js";

const graph = validateBuilding(demoBuilding);
const route = (start, state = createState(graph.initial_state), building = graph) => findBestRoute(building, start, state);

test("the five published sample outcomes", () => {
  assert.deepEqual(route("R1"), { status: "route", exitId: "E1", cost: 7, path: ["R1", "C1", "C2", "E1"] });
  const blockedJunction = createState(graph.initial_state);
  blockedJunction.blockedNodes.add("C2");
  assert.deepEqual(route("R1", blockedJunction), { status: "route", exitId: "E2", cost: 11, path: ["R1", "C1", "C3", "C4", "E2"] });
  const closedExits = createState(graph.initial_state);
  closedExits.closedExits.add("E1");
  closedExits.closedExits.add("E2");
  assert.equal(route("R1", closedExits).status, "noRoute");
  assert.deepEqual(route("R2"), { status: "route", exitId: "E2", cost: 7, path: ["R2", "C3", "C4", "E2"] });
  const blockedStart = createState(graph.initial_state);
  blockedStart.blockedNodes.add("R1");
  assert.equal(route("R1", blockedStart).status, "blockedStart");
});

test("a blocked corridor preserves access through other corridors and reset restores initial hazards", () => {
  const state = createState(graph.initial_state);
  state.blockedEdges.add("L02");
  assert.equal(route("R1", state).exitId, "E2");
  assert.equal(route("R1", createState(graph.initial_state)).exitId, "E1");
});

test("equal-cost exits choose the smallest exit ID, even if its path ID is larger", () => {
  const building = validateBuilding({
    building: "Tie", nodes: [
      { id: "S", label: "Start", type: "room", x: 0, y: 0 },
      { id: "A", label: "A", type: "junction", x: 1, y: 1 },
      { id: "Z", label: "Z", type: "junction", x: 1, y: 2 },
      { id: "E1", label: "E1", type: "exit", x: 2, y: 2 },
      { id: "E2", label: "E2", type: "exit", x: 2, y: 1 }
    ], edges: [
      { id: "a", from: "S", to: "A", cost: 1 }, { id: "b", from: "A", to: "E2", cost: 1 },
      { id: "c", from: "S", to: "Z", cost: 1 }, { id: "d", from: "Z", to: "E1", cost: 1 }
    ], initial_state: { blocked_nodes: [], blocked_edges: [], closed_exits: [] }
  });
  assert.deepEqual(route("S", createState(building.initial_state), building).path, ["S", "Z", "E1"]);
});

test("equal-cost paths to the same exit choose the lexicographically smallest node sequence", () => {
  const building = validateBuilding({
    building: "Path tie", nodes: [
      { id: "S", label: "Start", type: "room", x: 0, y: 0 },
      { id: "A", label: "A", type: "junction", x: 1, y: 1 },
      { id: "B", label: "B", type: "junction", x: 1, y: 2 },
      { id: "E", label: "Exit", type: "exit", x: 2, y: 1 }
    ], edges: [
      { id: "a", from: "S", to: "B", cost: 1 }, { id: "b", from: "B", to: "E", cost: 1 },
      { id: "c", from: "S", to: "A", cost: 1 }, { id: "d", from: "A", to: "E", cost: 1 }
    ], initial_state: { blocked_nodes: [], blocked_edges: [], closed_exits: [] }
  });
  assert.deepEqual(route("S", createState(building.initial_state), building).path, ["S", "A", "E"]);
});

test("disconnected areas and initially closed exits are handled", () => {
  const building = validateBuilding({
    building: "Disconnected", nodes: [
      { id: "S", label: "S", type: "room", x: 0, y: 0 },
      { id: "J", label: "J", type: "junction", x: 1, y: 0 },
      { id: "E", label: "E", type: "exit", x: 2, y: 0 }
    ], edges: [{ id: "x", from: "S", to: "J", cost: 1 }],
    initial_state: { blocked_nodes: [], blocked_edges: [], closed_exits: ["E"] }
  });
  assert.equal(route("S", createState(building.initial_state), building).status, "noRoute");
});

test("invalid and inconsistent files report specific validation errors", () => {
  const copy = () => structuredClone(demoBuilding);
  const badEndpoint = copy(); badEndpoint.edges[0].to = "missing";
  assert.throws(() => validateBuilding(badEndpoint), error => error instanceof ValidationError && error.code === "edgeEndpoint");
  const duplicate = copy(); duplicate.edges.push({ id: "extra", from: "C1", to: "R1", cost: 1 });
  assert.throws(() => validateBuilding(duplicate), error => error.code === "duplicatePair");
  const badState = copy(); badState.initial_state.blocked_nodes = ["E1"];
  assert.throws(() => validateBuilding(badState), error => error.code === "blockedNodeId");
  const badCost = copy(); badCost.edges[0].cost = 0;
  assert.throws(() => validateBuilding(badCost), error => error.code === "invalidEdge");
  const missingArray = copy(); delete missingArray.initial_state.closed_exits;
  assert.throws(() => validateBuilding(missingArray), error => error.code === "invalidState");
});

test("routing agrees with an independent exhaustive search on 300 small graphs", () => {
  let seed = 0x51a7e;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
  const compareSequence = (a, b) => {
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
    }
    return a.length - b.length;
  };
  const order = (a, b) => a.cost - b.cost || (a.exitId < b.exitId ? -1 : a.exitId > b.exitId ? 1 : 0) || compareSequence(a.path, b.path);

  function exhaustive(building, start, hazards) {
    if (hazards.blockedNodes.has(start)) return { status: "blockedStart" };
    const candidates = [];
    const walk = (current, path, cost) => {
      const node = building.nodes.find(item => item.id === current);
      if (node.type === "exit") candidates.push({ status: "route", exitId: current, cost, path });
      for (const edge of building.edges) {
        if (hazards.blockedEdges.has(edge.id)) continue;
        const next = edge.from === current ? edge.to : edge.to === current ? edge.from : null;
        if (!next || path.includes(next) || hazards.blockedNodes.has(next) || hazards.closedExits.has(next)) continue;
        walk(next, [...path, next], cost + edge.cost);
      }
    };
    walk(start, [start], 0);
    candidates.sort(order);
    return candidates[0] ?? { status: "noRoute" };
  }

  for (let caseNo = 0; caseNo < 300; caseNo++) {
    const count = 3 + Math.floor(random() * 5);
    const exitCount = 1 + Math.floor(random() * Math.min(3, count - 1));
    const nodes = Array.from({ length: count }, (_, index) => ({
      id: index >= count - exitCount ? `E${index}` : `N${index}`,
      label: `Location ${index}`,
      type: index >= count - exitCount ? "exit" : index === 0 ? "room" : "junction",
      x: index * 20, y: (index % 3) * 20
    }));
    const edges = [];
    for (let a = 0; a < count; a++) for (let b = a + 1; b < count; b++) {
      if (random() < 0.47) edges.push({ id: `L${a}-${b}`, from: nodes[a].id, to: nodes[b].id, cost: 1 + Math.floor(random() * 5) });
    }
    if (!edges.length) edges.push({ id: "L0-1", from: nodes[0].id, to: nodes[1].id, cost: 1 });
    const building = validateBuilding({ building: "Generated check", nodes, edges,
      initial_state: { blocked_nodes: [], blocked_edges: [], closed_exits: [] } });
    const hazards = createState(building.initial_state);
    for (const node of nodes) {
      if (random() < 0.15) (node.type === "exit" ? hazards.closedExits : hazards.blockedNodes).add(node.id);
    }
    for (const edge of edges) if (random() < 0.13) hazards.blockedEdges.add(edge.id);
    const start = nodes.find(node => node.type !== "exit").id;
    assert.deepEqual(findBestRoute(building, start, hazards), exhaustive(building, start, hazards), `generated case ${caseNo}`);
  }
});
