import { BattleState, Faction, UnitModel } from './BattleTypes';

const PLAYER_STATES = new Set<BattleState>([
  BattleState.PlayerTurnStart,
  BattleState.PlayerIdle,
  BattleState.UnitSelected,
  BattleState.UnitMoving,
  BattleState.ActionMenu,
  BattleState.TargetSelecting,
  BattleState.CombatPreview,
  BattleState.CombatResolving,
]);

export class TurnManager {
  public state = BattleState.OpeningDialogue;
  public round = 1;
  public faction = Faction.Player;

  public setState(next: BattleState): void {
    this.state = next;
  }

  public startPlayerTurn(units: UnitModel[]): void {
    this.faction = Faction.Player;
    for (const unit of units) {
      if (unit.faction === Faction.Player && unit.alive) {
        unit.acted = false;
      }
    }
    this.state = BattleState.PlayerTurnStart;
  }

  public startEnemyTurn(units: UnitModel[]): void {
    this.faction = Faction.Enemy;
    for (const unit of units) {
      if (unit.faction === Faction.Enemy && unit.alive) {
        unit.acted = false;
      }
    }
    this.state = BattleState.EnemyTurn;
  }

  public finishEnemyTurn(): void {
    this.round += 1;
    this.faction = Faction.Player;
  }

  public allActed(units: UnitModel[], faction: Faction): boolean {
    const living = units.filter((unit) => unit.alive && unit.faction === faction);
    return living.length === 0 || living.every((unit) => unit.acted);
  }

  public canAcceptPlayerInput(): boolean {
    return this.faction === Faction.Player && PLAYER_STATES.has(this.state);
  }
}
