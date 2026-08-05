import { Faction, GridPosition, ReachableCell, UnitModel, manhattan, posKey } from './BattleTypes';
import { GridModel } from './GridModel';

interface FrontierCell {
  position: GridPosition;
  cost: number;
}

export class Pathfinding {
  public static reachable(grid: GridModel, unit: UnitModel): Map<string, ReachableCell> {
    const startKey = posKey(unit.position);
    const costs = new Map<string, number>([[startKey, 0]]);
    const previous = new Map<string, GridPosition>();
    const frontier: FrontierCell[] = [{ position: { ...unit.position }, cost: 0 }];

    while (frontier.length > 0) {
      frontier.sort((a, b) => a.cost - b.cost);
      const current = frontier.shift()!;
      if (current.cost !== costs.get(posKey(current.position))) {
        continue;
      }

      for (const next of grid.neighbors(current.position)) {
        if (!grid.canEnter(next, unit, true)) {
          continue;
        }
        const occupant = grid.unitAt(next, unit.id);
        if (occupant && occupant.faction !== unit.faction) {
          continue;
        }
        const nextCost = current.cost + grid.terrainAt(next).moveCost;
        if (nextCost > unit.move || nextCost >= (costs.get(posKey(next)) ?? Number.POSITIVE_INFINITY)) {
          continue;
        }
        costs.set(posKey(next), nextCost);
        previous.set(posKey(next), current.position);
        frontier.push({ position: next, cost: nextCost });
      }
    }

    const reachable = new Map<string, ReachableCell>();
    for (const [key, cost] of costs) {
      const [x, y] = key.split(',').map(Number);
      const position = { x, y };
      if (!grid.canStop(position, unit) && key !== startKey) {
        continue;
      }
      reachable.set(key, {
        position,
        cost,
        path: this.reconstructPath(unit.position, position, previous),
      });
    }
    return reachable;
  }

  public static attackCells(
    origin: GridPosition,
    minRange: number,
    maxRange: number,
    grid: GridModel,
  ): GridPosition[] {
    const cells: GridPosition[] = [];
    for (let y = 0; y < grid.height; y += 1) {
      for (let x = 0; x < grid.width; x += 1) {
        const position = { x, y };
        const distance = manhattan(origin, position);
        if (distance >= minRange && distance <= maxRange) {
          cells.push(position);
        }
      }
    }
    return cells;
  }

  public static targetsInRange(
    attacker: UnitModel,
    units: UnitModel[],
    desiredFaction: Faction,
  ): UnitModel[] {
    return units.filter((target) => {
      if (!target.alive || target.faction !== desiredFaction || target.id === attacker.id) {
        return false;
      }
      const distance = manhattan(attacker.position, target.position);
      return distance >= attacker.minRange && distance <= attacker.maxRange;
    });
  }

  private static reconstructPath(
    start: GridPosition,
    end: GridPosition,
    previous: Map<string, GridPosition>,
  ): GridPosition[] {
    const path: GridPosition[] = [{ ...end }];
    let cursor = end;
    while (posKey(cursor) !== posKey(start)) {
      const parent = previous.get(posKey(cursor));
      if (!parent) {
        return [{ ...start }];
      }
      cursor = parent;
      path.unshift({ ...cursor });
    }
    return path;
  }
}
