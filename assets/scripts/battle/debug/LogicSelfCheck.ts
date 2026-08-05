import { CombatResolver } from '../core/CombatResolver';
import { GridModel, TERRAIN } from '../core/GridModel';
import { Pathfinding } from '../core/Pathfinding';
import {
  Faction,
  TerrainType,
  UnitClass,
  UnitModel,
  cloneUnit,
  posKey,
} from '../core/BattleTypes';

export function runLogicSelfCheck(): void {
  const terrain: TerrainType[][] = [
    [TerrainType.Ground, TerrainType.Forest, TerrainType.Rock],
    [TerrainType.Ground, TerrainType.Ground, TerrainType.Ground],
  ];
  const template = {
    id: 'self-player', displayName: '测试', faction: Faction.Player, unitClass: UnitClass.Vanguard,
    level: 1, exp: 95, maxHp: 20, attack: 10, defense: 4, move: 3,
    minRange: 1, maxRange: 1, position: { x: 0, y: 0 },
  } as const;
  const player = cloneUnit(template);
  const enemy: UnitModel = cloneUnit({
    ...template,
    id: 'self-enemy',
    faction: Faction.Enemy,
    position: { x: 1, y: 1 },
    defense: 3,
  });
  const grid = new GridModel(terrain, [player, enemy]);
  const reachable = Pathfinding.reachable(grid, player);
  console.assert(reachable.get(posKey({ x: 1, y: 0 }))?.cost === 2, '[SelfCheck] forest cost must be 2');
  console.assert(!reachable.has(posKey({ x: 2, y: 0 })), '[SelfCheck] rock must be impassable');
  console.assert(TERRAIN[TerrainType.Forest].defenseBonus === 2, '[SelfCheck] forest defense must be 2');
  console.assert(CombatResolver.damage(player, enemy, grid) === 7, '[SelfCheck] damage formula mismatch');
  player.position = { x: 0, y: 1 };
  const forecast = CombatResolver.forecast(player, enemy, grid);
  console.assert(forecast.damage === 7 && forecast.canCounter, '[SelfCheck] forecast mismatch');
  console.info('[AshesPass] logic self-check passed');
}
