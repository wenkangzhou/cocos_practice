import { EnemyPlan, Faction, GridPosition, UnitModel, manhattan, posKey } from './BattleTypes';
import { GridModel } from './GridModel';
import { Pathfinding } from './Pathfinding';

export class EnemyAI {
  public static plan(unit: UnitModel, players: UnitModel[], grid: GridModel): EnemyPlan {
    const livingPlayers = players.filter((player) => player.alive && player.faction === Faction.Player);
    const attackableNow = this.attackableFrom(unit, unit.position, livingPlayers);
    if (attackableNow.length > 0) {
      return {
        unitId: unit.id,
        destination: { ...unit.position },
        path: [{ ...unit.position }],
        targetId: this.selectTarget(attackableNow).id,
      };
    }

    const reachable = Array.from(Pathfinding.reachable(grid, unit).values());
    const candidates = reachable.map((cell) => {
      const targets = this.attackableFrom(unit, cell.position, livingPlayers);
      const nearestDistance = livingPlayers.reduce(
        (best, player) => Math.min(best, manhattan(cell.position, player.position)),
        Number.POSITIVE_INFINITY,
      );
      return { cell, targets, nearestDistance };
    });

    candidates.sort((a, b) => {
      if ((a.targets.length > 0) !== (b.targets.length > 0)) {
        return a.targets.length > 0 ? -1 : 1;
      }
      if (a.nearestDistance !== b.nearestDistance) {
        return a.nearestDistance - b.nearestDistance;
      }
      if (a.cell.cost !== b.cell.cost) {
        return b.cell.cost - a.cell.cost;
      }
      return posKey(a.cell.position).localeCompare(posKey(b.cell.position));
    });

    const best = candidates[0];
    const plan: EnemyPlan = {
      unitId: unit.id,
      destination: best ? { ...best.cell.position } : { ...unit.position },
      path: best ? best.cell.path : [{ ...unit.position }],
    };
    if (best?.targets.length) {
      plan.targetId = this.selectTarget(best.targets).id;
    }
    return plan;
  }

  private static attackableFrom(unit: UnitModel, origin: GridPosition, players: UnitModel[]): UnitModel[] {
    return players.filter((player) => {
      const distance = manhattan(origin, player.position);
      return distance >= unit.minRange && distance <= unit.maxRange;
    });
  }

  private static selectTarget(targets: UnitModel[]): UnitModel {
    return targets.slice().sort((a, b) => {
      if (a.isLeader !== b.isLeader) {
        return a.isLeader ? -1 : 1;
      }
      if (a.hp !== b.hp) {
        return a.hp - b.hp;
      }
      return a.id.localeCompare(b.id);
    })[0];
  }
}
