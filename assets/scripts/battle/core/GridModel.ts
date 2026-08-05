import {
  GridPosition,
  TerrainDefinition,
  TerrainType,
  UnitModel,
  posKey,
  samePosition,
} from './BattleTypes';

export const TERRAIN: Record<TerrainType, TerrainDefinition> = {
  [TerrainType.Ground]: {
    type: TerrainType.Ground,
    name: '山道',
    moveCost: 1,
    defenseBonus: 0,
    passable: true,
  },
  [TerrainType.Forest]: {
    type: TerrainType.Forest,
    name: '灰松林',
    moveCost: 2,
    defenseBonus: 2,
    passable: true,
  },
  [TerrainType.Rock]: {
    type: TerrainType.Rock,
    name: '岩壁',
    moveCost: Number.POSITIVE_INFINITY,
    defenseBonus: 0,
    passable: false,
  },
  [TerrainType.Exit]: {
    type: TerrainType.Exit,
    name: '隘口出口',
    moveCost: 1,
    defenseBonus: 0,
    passable: true,
  },
};

export class GridModel {
  public readonly width: number;
  public readonly height: number;

  public constructor(
    private readonly cells: TerrainType[][],
    private readonly units: UnitModel[],
  ) {
    this.height = cells.length;
    this.width = cells[0]?.length ?? 0;
  }

  public contains(position: GridPosition): boolean {
    return position.x >= 0 && position.y >= 0 && position.x < this.width && position.y < this.height;
  }

  public terrainAt(position: GridPosition): TerrainDefinition {
    if (!this.contains(position)) {
      return TERRAIN[TerrainType.Rock];
    }
    return TERRAIN[this.cells[position.y][position.x]];
  }

  public unitAt(position: GridPosition, ignoreUnitId?: string): UnitModel | undefined {
    return this.units.find((unit) =>
      unit.alive && unit.id !== ignoreUnitId && samePosition(unit.position, position));
  }

  public neighbors(position: GridPosition): GridPosition[] {
    return [
      { x: position.x + 1, y: position.y },
      { x: position.x - 1, y: position.y },
      { x: position.x, y: position.y + 1 },
      { x: position.x, y: position.y - 1 },
    ].filter((next) => this.contains(next));
  }

  public canEnter(position: GridPosition, mover: UnitModel, allowFriendlyPass = true): boolean {
    if (!this.terrainAt(position).passable) {
      return false;
    }
    const occupant = this.unitAt(position, mover.id);
    if (!occupant) {
      return true;
    }
    return allowFriendlyPass && occupant.faction === mover.faction;
  }

  public canStop(position: GridPosition, mover: UnitModel): boolean {
    return this.terrainAt(position).passable && !this.unitAt(position, mover.id);
  }

  public occupiedKeys(exceptUnitId?: string): Set<string> {
    return new Set(this.units
      .filter((unit) => unit.alive && unit.id !== exceptUnitId)
      .map((unit) => posKey(unit.position)));
  }
}
