export enum Faction {
  Player = 'player',
  Enemy = 'enemy',
}

export enum UnitClass {
  Vanguard = '剑士',
  Archer = '弓手',
  Healer = '医者',
  Raider = '山匪',
  Captain = '守关队长',
}

export enum TerrainType {
  Ground = 0,
  Forest = 1,
  Rock = 2,
  Exit = 3,
}

export enum BattleState {
  OpeningDialogue = 'OpeningDialogue',
  PlayerTurnStart = 'PlayerTurnStart',
  PlayerIdle = 'PlayerIdle',
  UnitSelected = 'UnitSelected',
  UnitMoving = 'UnitMoving',
  ActionMenu = 'ActionMenu',
  TargetSelecting = 'TargetSelecting',
  CombatPreview = 'CombatPreview',
  CombatResolving = 'CombatResolving',
  EnemyTurn = 'EnemyTurn',
  Victory = 'Victory',
  Defeat = 'Defeat',
}

export interface GridPosition {
  x: number;
  y: number;
}

export interface TerrainDefinition {
  type: TerrainType;
  name: string;
  moveCost: number;
  defenseBonus: number;
  passable: boolean;
}

export interface UnitTemplate {
  id: string;
  displayName: string;
  faction: Faction;
  unitClass: UnitClass;
  level: number;
  exp: number;
  maxHp: number;
  attack: number;
  defense: number;
  move: number;
  minRange: number;
  maxRange: number;
  position: GridPosition;
  isLeader?: boolean;
  isBoss?: boolean;
}

export interface UnitModel extends UnitTemplate {
  hp: number;
  acted: boolean;
  alive: boolean;
}

export interface ReachableCell {
  position: GridPosition;
  cost: number;
  path: GridPosition[];
}

export interface CombatForecast {
  attackerId: string;
  defenderId: string;
  distance: number;
  damage: number;
  defenderHpAfter: number;
  canCounter: boolean;
  counterDamage: number;
  attackerHpAfter: number;
}

export interface CombatOutcome extends CombatForecast {
  defenderDefeated: boolean;
  attackerDefeated: boolean;
  expGained: number;
  leveledUp: boolean;
}

export interface DialogueLine {
  speaker: string;
  text: string;
  side: 'left' | 'right';
}

export interface ChapterDefinition {
  id: string;
  title: string;
  subtitle: string;
  objective: string;
  width: number;
  height: number;
  terrain: TerrainType[][];
  units: UnitTemplate[];
  dialogue: DialogueLine[];
}

export interface EnemyPlan {
  unitId: string;
  destination: GridPosition;
  path: GridPosition[];
  targetId?: string;
}

export function posKey(position: GridPosition): string {
  return `${position.x},${position.y}`;
}

export function samePosition(a: GridPosition, b: GridPosition): boolean {
  return a.x === b.x && a.y === b.y;
}

export function manhattan(a: GridPosition, b: GridPosition): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function cloneUnit(template: UnitTemplate): UnitModel {
  return {
    ...template,
    position: { ...template.position },
    hp: template.maxHp,
    acted: false,
    alive: true,
  };
}
