import { CombatForecast, CombatOutcome, GridPosition, UnitModel, manhattan } from './BattleTypes';
import { GridModel } from './GridModel';

export class CombatResolver {
  public static canAttack(attacker: UnitModel, defender: UnitModel): boolean {
    if (!attacker.alive || !defender.alive || attacker.faction === defender.faction) {
      return false;
    }
    const distance = manhattan(attacker.position, defender.position);
    return distance >= attacker.minRange && distance <= attacker.maxRange;
  }

  public static damage(attacker: UnitModel, defender: UnitModel, grid: GridModel): number {
    const terrainDefense = grid.terrainAt(defender.position).defenseBonus;
    return Math.max(1, attacker.attack - defender.defense - terrainDefense);
  }

  public static forecast(attacker: UnitModel, defender: UnitModel, grid: GridModel): CombatForecast {
    const distance = manhattan(attacker.position, defender.position);
    const damage = this.damage(attacker, defender, grid);
    const defenderHpAfter = Math.max(0, defender.hp - damage);
    const canCounter = defenderHpAfter > 0 && this.rangeCovers(defender, attacker.position);
    const counterDamage = canCounter ? this.damage(defender, attacker, grid) : 0;
    return {
      attackerId: attacker.id,
      defenderId: defender.id,
      distance,
      damage,
      defenderHpAfter,
      canCounter,
      counterDamage,
      attackerHpAfter: Math.max(0, attacker.hp - counterDamage),
    };
  }

  public static resolve(attacker: UnitModel, defender: UnitModel, grid: GridModel): CombatOutcome {
    const forecast = this.forecast(attacker, defender, grid);
    defender.hp = forecast.defenderHpAfter;
    const defenderDefeated = defender.hp <= 0;
    if (defenderDefeated) {
      defender.alive = false;
    }
    if (forecast.canCounter && !defenderDefeated) {
      attacker.hp = forecast.attackerHpAfter;
      if (attacker.hp <= 0) {
        attacker.alive = false;
      }
    }

    let expGained = 0;
    let leveledUp = false;
    if (attacker.faction === 'player') {
      expGained = 10 + (defenderDefeated ? 35 : 0);
      attacker.exp += expGained;
      if (attacker.exp >= 100) {
        attacker.exp -= 100;
        attacker.level += 1;
        attacker.maxHp += 4;
        attacker.attack += 2;
        attacker.defense += 1;
        attacker.hp = Math.min(attacker.maxHp, attacker.hp + 4);
        leveledUp = true;
      }
    }

    return {
      ...forecast,
      defenderDefeated,
      attackerDefeated: !attacker.alive,
      expGained,
      leveledUp,
    };
  }

  public static heal(healer: UnitModel, target: UnitModel): number {
    const amount = Math.min(target.maxHp - target.hp, 8 + Math.floor(healer.attack / 2));
    target.hp += amount;
    return amount;
  }

  public static rangeCovers(unit: UnitModel, position: GridPosition): boolean {
    const distance = manhattan(unit.position, position);
    return distance >= unit.minRange && distance <= unit.maxRange;
  }
}
