import assert from 'node:assert/strict';

const GROUND = { passable: true, moveCost: 1, defense: 0 };
const FOREST = { passable: true, moveCost: 2, defense: 2 };
const ROCK = { passable: false, moveCost: Infinity, defense: 0 };
const key = ({ x, y }) => `${x},${y}`;
const distance = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

function reachable(terrain, start, budget, occupied = new Set()) {
  const height = terrain.length;
  const width = terrain[0].length;
  const cost = new Map([[key(start), 0]]);
  const queue = [{ ...start }];
  while (queue.length) {
    queue.sort((a, b) => cost.get(key(a)) - cost.get(key(b)));
    const current = queue.shift();
    for (const next of [
      { x: current.x + 1, y: current.y }, { x: current.x - 1, y: current.y },
      { x: current.x, y: current.y + 1 }, { x: current.x, y: current.y - 1 },
    ]) {
      if (next.x < 0 || next.y < 0 || next.x >= width || next.y >= height) continue;
      const cell = terrain[next.y][next.x];
      if (!cell.passable || occupied.has(key(next))) continue;
      const nextCost = cost.get(key(current)) + cell.moveCost;
      if (nextCost <= budget && nextCost < (cost.get(key(next)) ?? Infinity)) {
        cost.set(key(next), nextCost);
        queue.push(next);
      }
    }
  }
  return cost;
}

function damage(attacker, defender, terrain) {
  return Math.max(1, attacker.attack - defender.defense - terrain.defense);
}

function canAttack(attacker, defender) {
  const d = distance(attacker.position, defender.position);
  return d >= attacker.minRange && d <= attacker.maxRange;
}

const map = [
  [GROUND, FOREST, ROCK],
  [GROUND, GROUND, GROUND],
];
const costs = reachable(map, { x: 0, y: 0 }, 3);
assert.equal(costs.get('1,0'), 2, 'forest movement cost');
assert.equal(costs.has('2,0'), false, 'rock is impassable');
assert.equal(costs.get('1,1'), 2, 'shortest path uses ground');
assert.equal(reachable(map, { x: 0, y: 0 }, 3, new Set(['0,1'])).has('0,1'), false, 'occupied stop is illegal');

const sword = { attack: 12, defense: 6, minRange: 1, maxRange: 1, position: { x: 0, y: 0 } };
const archer = { attack: 14, defense: 3, minRange: 2, maxRange: 2, position: { x: 0, y: 0 } };
const enemy = { attack: 10, defense: 4, minRange: 1, maxRange: 1, position: { x: 1, y: 0 } };
assert.equal(damage(sword, enemy, GROUND), 8, 'base damage');
assert.equal(damage(sword, enemy, FOREST), 6, 'forest defense bonus');
assert.equal(canAttack(sword, enemy), true, 'melee distance one');
assert.equal(canAttack(archer, enemy), false, 'archer cannot attack adjacent');
enemy.position = { x: 2, y: 0 };
assert.equal(canAttack(archer, enemy), true, 'archer attacks at exactly two');

const heal = (current, max, amount) => Math.min(max, current + amount);
assert.equal(heal(18, 21, 12), 21, 'healing is capped at max HP');

let exp = 86 + 10 + 35;
let level = 2;
if (exp >= 100) {
  exp -= 100;
  level += 1;
}
assert.deepEqual({ exp, level }, { exp: 31, level: 3 }, 'kill grants a visible level up');

console.log('Ashes Pass logic self-check: 11 assertions passed.');
