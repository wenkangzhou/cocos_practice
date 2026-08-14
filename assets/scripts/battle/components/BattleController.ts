import { _decorator, Component, director, Node } from 'cc';
import { DEBUG } from 'cc/env';
import { CHAPTER_01 } from '../data/Chapter01Config';
import {
  BattleState,
  CombatOutcome,
  Faction,
  GridPosition,
  ReachableCell,
  UnitClass,
  UnitModel,
  cloneUnit,
  manhattan,
  posKey,
} from '../core/BattleTypes';
import { GridModel } from '../core/GridModel';
import { Pathfinding } from '../core/Pathfinding';
import { CombatResolver } from '../core/CombatResolver';
import { TurnManager } from '../core/TurnManager';
import { EnemyAI } from '../core/EnemyAI';
import { CombatPresenter } from './CombatPresenter';
import { GridView } from './GridView';
import { HUDController } from './HUDController';
import { UnitView } from './UnitView';
import { runLogicSelfCheck } from '../debug/LogicSelfCheck';

const { ccclass, property } = _decorator;

type TargetMode = 'attack' | 'heal' | undefined;
const DOUBLE_TAP_INTERVAL_MS = 480;

@ccclass('BattleController')
export class BattleController extends Component {
  @property({ type: Node, tooltip: '编辑器预置：地图格容器' })
  public boardRoot: Node | null = null;

  @property({ type: Node, tooltip: '编辑器预置：移动/攻击范围容器' })
  public rangeRoot: Node | null = null;

  @property({ type: Node, tooltip: '编辑器预置：单位容器' })
  public unitRoot: Node | null = null;

  @property({ type: Node, tooltip: '编辑器预置：伤害数字与战斗特效容器' })
  public effectsRoot: Node | null = null;

  @property({ type: Node, tooltip: '编辑器预置：常驻 HUD 容器' })
  public hudRoot: Node | null = null;

  @property({ type: Node, tooltip: '编辑器预置：对话/预览/结算容器' })
  public overlayRoot: Node | null = null;

  @property({ type: Node, tooltip: '编辑器预置：开发调试容器' })
  public debugRoot: Node | null = null;

  @property({ tooltip: '敌方每个行动之间的可读停顿（秒）' })
  public enemyActionDelay = 0.28;

  private units: UnitModel[] = [];
  private grid!: GridModel;
  private gridView!: GridView;
  private hud!: HUDController;
  private presenter!: CombatPresenter;
  private readonly turn = new TurnManager();
  private readonly unitViews = new Map<string, UnitView>();
  private selected?: UnitModel;
  private originalPosition?: GridPosition;
  private reachable = new Map<string, ReachableCell>();
  private targetMode: TargetMode;
  private bossSpoke = false;
  private coordinatesVisible = false;
  private idsVisible = false;
  private disposed = false;
  private lastDestinationPressKey?: string;
  private lastDestinationPressAt = 0;

  protected onLoad(): void {
    this.resolveSceneReferences();
    this.units = CHAPTER_01.units.map(cloneUnit);
    this.grid = new GridModel(CHAPTER_01.terrain, this.units);
    this.gridView = new GridView(this.boardRoot!, this.rangeRoot!, this.grid, (position) => this.onTilePressed(position));
    this.gridView.build();

    for (const unit of this.units) {
      const view = new UnitView(this.unitRoot!, unit, this.gridView, (pressed) => this.onUnitPressed(pressed));
      this.unitViews.set(unit.id, view);
    }
    this.presenter = new CombatPresenter(this.effectsRoot!, this.gridView, this.unitViews);
    this.hud = new HUDController(
      this.hudRoot!,
      this.overlayRoot!,
      this.debugRoot!,
      () => this.requestEndTurn(),
      {
        toggleCoordinates: () => this.toggleCoordinates(),
        toggleIds: () => this.toggleIds(),
        switchTurn: () => this.debugSwitchTurn(),
        changeHp: (delta) => this.debugChangeHp(delta),
        victory: () => this.finishBattle(true),
        defeat: () => this.finishBattle(false),
        reset: () => this.reloadChapter(),
      },
      DEBUG,
    );
    this.hud.setObjective(CHAPTER_01.objective);
    this.hud.setTurn(1, Faction.Player);
    runLogicSelfCheck();
  }

  protected start(): void {
    this.turn.setState(BattleState.OpeningDialogue);
    this.scheduleOnce(() => {
      if (!this.disposed) {
        this.hud.showDialogue(CHAPTER_01.dialogue, () => void this.startPlayerTurn());
      }
    }, 0.15);
  }

  protected onDestroy(): void {
    this.disposed = true;
    this.unscheduleAllCallbacks();
  }

  private async startPlayerTurn(): Promise<void> {
    if (this.isBattleOver()) return;
    this.clearSelection();
    this.turn.startPlayerTurn(this.units);
    this.refreshAllViews();
    this.hud.setTurn(this.turn.round, Faction.Player);
    await this.hud.showBanner(`玩家回合  ${this.turn.round}`, Faction.Player);
    if (this.disposed || this.isBattleOver()) return;
    this.turn.setState(BattleState.PlayerIdle);
    this.hud.showUnit();
  }

  private onTilePressed(position: GridPosition): void {
    this.hud.showTerrain(this.grid.terrainAt(position), position);
    if (!this.turn.canAcceptPlayerInput() || !this.selected) {
      return;
    }
    if (this.turn.state !== BattleState.UnitSelected) {
      return;
    }
    this.handleDestinationPress(position);
  }

  private onUnitPressed(unit: UnitModel): void {
    this.hud.showUnit(unit);
    this.hud.showTerrain(this.grid.terrainAt(unit.position), unit.position);
    if (!unit.alive || !this.turn.canAcceptPlayerInput()) {
      return;
    }
    if (this.turn.state === BattleState.TargetSelecting && this.selected) {
      this.previewTarget(unit);
      return;
    }
    if (unit.faction !== Faction.Player) {
      if (this.turn.state === BattleState.PlayerIdle || this.turn.state === BattleState.UnitSelected) {
        this.showEnemyMovementRange(unit);
      }
      return;
    }
    if (unit.acted) {
      this.hud.toast(`${unit.displayName} 本回合已经行动`);
      return;
    }
    if (this.turn.state === BattleState.UnitSelected && this.selected?.id === unit.id) {
      this.handleDestinationPress(unit.position);
      return;
    }
    if (this.turn.state === BattleState.PlayerIdle || this.turn.state === BattleState.UnitSelected) {
      this.selectUnit(unit);
    }
  }

  private selectUnit(unit: UnitModel): void {
    this.resetTilePress();
    if (this.selected && this.selected.id !== unit.id) {
      this.unitViews.get(this.selected.id)?.setSelected(false);
    }
    this.selected = unit;
    this.originalPosition = { ...unit.position };
    this.reachable = Pathfinding.reachable(this.grid, unit);
    this.unitViews.get(unit.id)?.setSelected(true);
    this.turn.setState(BattleState.UnitSelected);
    this.gridView.showRange(Array.from(this.reachable.values(), (cell) => cell.position), 'move');
    this.showSelectionActions();
    this.hud.showUnit(unit);
    this.rememberDestinationPress(unit.position);
  }

  private handleDestinationPress(position: GridPosition): void {
    const key = posKey(position);
    const cell = this.reachable.get(key);
    if (!cell) {
      this.resetTilePress();
      this.hud.toast('该格不在可移动范围内');
      return;
    }
    const now = Date.now();
    const isDoubleTap = this.lastDestinationPressKey === key
      && now - this.lastDestinationPressAt <= DOUBLE_TAP_INTERVAL_MS;
    if (isDoubleTap) {
      this.resetTilePress();
      void this.confirmMove(cell);
      return;
    }
    this.lastDestinationPressKey = key;
    this.lastDestinationPressAt = now;
    this.gridView.showRange(Array.from(this.reachable.values(), (value) => value.position), 'move');
    this.gridView.showPath(cell.path);
    this.hud.showMoveConfirm(position, cell.cost, () => void this.confirmMove(cell), () => {
      this.gridView.showRange(Array.from(this.reachable.values(), (value) => value.position), 'move');
      this.showSelectionActions();
    });
  }

  private rememberDestinationPress(position: GridPosition): void {
    this.lastDestinationPressKey = posKey(position);
    this.lastDestinationPressAt = Date.now();
  }

  private showEnemyMovementRange(unit: UnitModel): void {
    this.clearSelection();
    this.turn.setState(BattleState.PlayerIdle);
    const reachable = Pathfinding.reachable(this.grid, unit);
    this.gridView.showRange(Array.from(reachable.values(), (cell) => cell.position), 'enemyMove');
    this.hud.showUnit(unit);
    this.hud.toast(unit.move === 0
      ? `${unit.displayName} 固守隘口，不会主动移动`
      : '红色区域：该敌人本回合可移动范围');
  }

  private showSelectionActions(): void {
    if (!this.selected) return;
    const current = this.reachable.get(posKey(this.selected.position));
    if (current) {
      this.hud.showMoveConfirm(this.selected.position, 0, () => void this.confirmMove(current), () => this.clearSelection());
    }
  }

  private async confirmMove(cell: ReachableCell): Promise<void> {
    const unit = this.selected;
    if (!unit || this.turn.state !== BattleState.UnitSelected) return;
    this.turn.setState(BattleState.UnitMoving);
    this.hud.clearActionMenu();
    this.gridView.clearMarkers();
    unit.position = { ...cell.position };
    await this.presenter.move(unit, cell.path);
    if (this.disposed) return;
    this.unitViews.get(unit.id)?.syncPosition();
    this.turn.setState(BattleState.ActionMenu);
    this.showActionMenu();
  }

  private showActionMenu(): void {
    const unit = this.selected;
    if (!unit) return;
    const targets = this.availablePrimaryTargets(unit);
    this.hud.showActionMenu(
      unit,
      targets.length > 0,
      () => this.beginTargetSelection(),
      () => this.finishPlayerAction(),
      () => this.cancelMove(),
    );
    this.hud.showUnit(unit);
  }

  private beginTargetSelection(): void {
    const unit = this.selected;
    if (!unit || this.turn.state !== BattleState.ActionMenu) return;
    const targets = this.availablePrimaryTargets(unit);
    if (targets.length === 0) {
      this.hud.toast(unit.unitClass === UnitClass.Healer ? '相邻没有受伤友军' : '射程内没有敌人');
      return;
    }
    this.targetMode = unit.unitClass === UnitClass.Healer ? 'heal' : 'attack';
    this.turn.setState(BattleState.TargetSelecting);
    const cells = this.targetMode === 'heal'
      ? Pathfinding.attackCells(unit.position, 1, 1, this.grid)
      : Pathfinding.attackCells(unit.position, unit.minRange, unit.maxRange, this.grid);
    this.gridView.showRange(cells, this.targetMode);
    this.hud.showTargetCancel(this.targetMode, () => {
      this.targetMode = undefined;
      this.turn.setState(BattleState.ActionMenu);
      this.gridView.clearMarkers();
      this.showActionMenu();
    });
    this.hud.toast(this.targetMode === 'heal' ? '选择绿色范围内的受伤友军' : '选择红色范围内的敌人');
  }

  private previewTarget(target: UnitModel): void {
    const attacker = this.selected;
    if (!attacker) return;
    if (this.targetMode === 'attack') {
      if (!CombatResolver.canAttack(attacker, target)) {
        this.hud.toast('该目标不在合法攻击距离');
        return;
      }
      const forecast = CombatResolver.forecast(attacker, target, this.grid);
      this.turn.setState(BattleState.CombatPreview);
      this.hud.showCombatPreview(attacker, target, forecast, () => void this.resolvePlayerCombat(target), () => {
        this.hud.clearModal();
        this.turn.setState(BattleState.TargetSelecting);
      });
      return;
    }
    if (this.targetMode === 'heal') {
      if (target.faction !== Faction.Player || target.hp >= target.maxHp || manhattan(attacker.position, target.position) !== 1) {
        this.hud.toast('只能治疗相邻的受伤友军');
        return;
      }
      const amount = Math.min(target.maxHp - target.hp, 8 + Math.floor(attacker.attack / 2));
      this.turn.setState(BattleState.CombatPreview);
      this.hud.showHealPreview(attacker, target, amount, () => this.resolveHealing(target), () => {
        this.hud.clearModal();
        this.turn.setState(BattleState.TargetSelecting);
      });
    }
  }

  private async resolvePlayerCombat(defender: UnitModel): Promise<void> {
    const attacker = this.selected;
    if (!attacker || this.turn.state !== BattleState.CombatPreview) return;
    this.turn.setState(BattleState.CombatResolving);
    this.hud.clearModal();
    this.gridView.clearMarkers();
    if (defender.isBoss && !this.bossSpoke) {
      this.bossSpoke = true;
      await this.hud.showBossLine('想穿过隘口？先把你们的决心留在这里！');
    }
    const forecast = CombatResolver.forecast(attacker, defender, this.grid);
    await this.presenter.strike(attacker, defender, forecast.damage);
    const outcome = CombatResolver.resolve(attacker, defender, this.grid);
    this.refreshAllViews();
    if (outcome.defenderDefeated) {
      await this.presenter.death(defender);
    } else if (outcome.canCounter) {
      await this.presenter.strike(defender, attacker, outcome.counterDamage);
      this.refreshAllViews();
      if (outcome.attackerDefeated) {
        await this.presenter.death(attacker);
      }
    }
    if (outcome.leveledUp && attacker.alive) {
      this.presenter.levelUp(attacker);
      this.hud.toast(`${attacker.displayName} 升至 Lv.${attacker.level}！最大HP +4 / 攻击 +2 / 防御 +1`);
      await this.pause(0.7);
    }
    if (this.checkOutcome()) return;
    if (attacker.alive) attacker.acted = true;
    this.finishPlayerAction();
  }

  private resolveHealing(target: UnitModel): void {
    const healer = this.selected;
    if (!healer || this.turn.state !== BattleState.CombatPreview) return;
    this.turn.setState(BattleState.CombatResolving);
    this.hud.clearModal();
    this.gridView.clearMarkers();
    const amount = CombatResolver.heal(healer, target);
    this.presenter.heal(target, amount);
    healer.exp = Math.min(99, healer.exp + 12);
    healer.acted = true;
    this.refreshAllViews();
    this.hud.toast(`${target.displayName} 恢复 ${amount} HP`);
    this.finishPlayerAction();
  }

  private finishPlayerAction(): void {
    if (this.isBattleOver()) return;
    if (this.selected) {
      this.selected.acted = true;
      this.unitViews.get(this.selected.id)?.redraw();
    }
    this.clearSelection();
    this.turn.setState(BattleState.PlayerIdle);
    if (this.turn.allActed(this.units, Faction.Player)) {
      this.scheduleOnce(() => void this.startEnemyTurn(), 0.38);
    }
  }

  private cancelMove(): void {
    const unit = this.selected;
    if (!unit || !this.originalPosition || this.turn.state !== BattleState.ActionMenu) return;
    unit.position = { ...this.originalPosition };
    this.unitViews.get(unit.id)?.syncPosition();
    this.reachable = Pathfinding.reachable(this.grid, unit);
    this.turn.setState(BattleState.UnitSelected);
    this.gridView.showRange(Array.from(this.reachable.values(), (cell) => cell.position), 'move');
    this.showSelectionActions();
  }

  private requestEndTurn(): void {
    if (this.turn.faction !== Faction.Player || this.isBattleOver()) return;
    if (this.turn.state === BattleState.CombatResolving
      || this.turn.state === BattleState.UnitMoving
      || this.turn.state === BattleState.OpeningDialogue) {
      this.hud.toast('当前演出结束后才能结束回合');
      return;
    }
    this.clearSelection();
    void this.startEnemyTurn();
  }

  private async startEnemyTurn(): Promise<void> {
    if (this.isBattleOver() || this.turn.state === BattleState.EnemyTurn) return;
    this.clearSelection();
    this.turn.startEnemyTurn(this.units);
    this.hud.setTurn(this.turn.round, Faction.Enemy);
    await this.hud.showBanner(`敌方回合  ${this.turn.round}`, Faction.Enemy);
    const enemies = this.units.filter((unit) => unit.alive && unit.faction === Faction.Enemy);
    for (const enemy of enemies) {
      if (this.disposed || this.isBattleOver() || !enemy.alive) return;
      this.hud.showUnit(enemy);
      const players = this.units.filter((unit) => unit.alive && unit.faction === Faction.Player);
      const plan = EnemyAI.plan(enemy, players, this.grid);
      const previous = { ...enemy.position };
      enemy.position = { ...plan.destination };
      if (posKey(previous) !== posKey(plan.destination)) {
        await this.presenter.move(enemy, plan.path);
        this.unitViews.get(enemy.id)?.syncPosition();
      }
      if (plan.targetId) {
        const target = this.units.find((unit) => unit.id === plan.targetId && unit.alive);
        if (target && CombatResolver.canAttack(enemy, target)) {
          if (enemy.isBoss && !this.bossSpoke) {
            this.bossSpoke = true;
            await this.hud.showBossLine('出口由我镇守。你们一步也别想过去！');
          }
          const forecast = CombatResolver.forecast(enemy, target, this.grid);
          await this.presenter.strike(enemy, target, forecast.damage);
          const outcome = CombatResolver.resolve(enemy, target, this.grid);
          await this.presentEnemyOutcome(enemy, target, outcome);
          if (this.checkOutcome()) return;
        }
      }
      enemy.acted = true;
      this.unitViews.get(enemy.id)?.redraw();
      await this.pause(this.enemyActionDelay);
    }
    if (this.disposed || this.isBattleOver()) return;
    this.turn.finishEnemyTurn();
    await this.startPlayerTurn();
  }

  private async presentEnemyOutcome(attacker: UnitModel, defender: UnitModel, outcome: CombatOutcome): Promise<void> {
    this.refreshAllViews();
    if (outcome.defenderDefeated) {
      await this.presenter.death(defender);
    } else if (outcome.canCounter) {
      await this.presenter.strike(defender, attacker, outcome.counterDamage);
      this.refreshAllViews();
      if (outcome.attackerDefeated) {
        await this.presenter.death(attacker);
      }
    }
  }

  private availablePrimaryTargets(unit: UnitModel): UnitModel[] {
    if (unit.unitClass === UnitClass.Healer) {
      return this.units.filter((target) => target.alive
        && target.faction === Faction.Player
        && target.id !== unit.id
        && target.hp < target.maxHp
        && manhattan(unit.position, target.position) === 1);
    }
    return this.units.filter((target) => CombatResolver.canAttack(unit, target));
  }

  private clearSelection(): void {
    if (this.selected) {
      this.unitViews.get(this.selected.id)?.setSelected(false);
    }
    this.selected = undefined;
    this.originalPosition = undefined;
    this.targetMode = undefined;
    this.resetTilePress();
    this.reachable.clear();
    this.gridView?.clearMarkers();
    this.hud?.clearActionMenu();
    this.hud?.clearModal();
  }

  private resetTilePress(): void {
    this.lastDestinationPressKey = undefined;
    this.lastDestinationPressAt = 0;
  }

  private refreshAllViews(): void {
    for (const view of this.unitViews.values()) {
      view.redraw();
    }
    if (this.selected) this.hud.showUnit(this.selected);
  }

  private checkOutcome(): boolean {
    const boss = this.units.find((unit) => unit.isBoss);
    const leader = this.units.find((unit) => unit.isLeader);
    if (!leader?.alive) {
      this.finishBattle(false);
      return true;
    }
    if (!boss?.alive) {
      this.finishBattle(true);
      return true;
    }
    return false;
  }

  private finishBattle(victory: boolean): void {
    if (this.isBattleOver()) return;
    this.clearSelection();
    this.turn.setState(victory ? BattleState.Victory : BattleState.Defeat);
    this.hud.showResult(victory, this.turn.round, () => this.reloadChapter(), () => director.loadScene('Title'));
  }

  private isBattleOver(): boolean {
    return this.turn.state === BattleState.Victory || this.turn.state === BattleState.Defeat;
  }

  private pause(seconds: number): Promise<void> {
    return new Promise((resolve) => this.scheduleOnce(resolve, seconds));
  }

  private reloadChapter(): void {
    director.loadScene('Chapter01');
  }

  private toggleCoordinates(): void {
    this.coordinatesVisible = !this.coordinatesVisible;
    this.gridView.setCoordinatesVisible(this.coordinatesVisible);
  }

  private toggleIds(): void {
    this.idsVisible = !this.idsVisible;
    for (const view of this.unitViews.values()) view.setIdVisible(this.idsVisible);
  }

  private debugSwitchTurn(): void {
    if (this.isBattleOver()) return;
    if (this.turn.faction === Faction.Player) {
      this.turn.setState(BattleState.PlayerIdle);
      void this.startEnemyTurn();
    } else {
      this.turn.finishEnemyTurn();
      void this.startPlayerTurn();
    }
  }

  private debugChangeHp(delta: number): void {
    if (!this.selected) {
      this.hud.toast('先选择一个单位');
      return;
    }
    this.selected.hp = Math.max(0, Math.min(this.selected.maxHp, this.selected.hp + delta));
    if (this.selected.hp === 0) this.selected.alive = false;
    this.refreshAllViews();
    this.checkOutcome();
  }

  private resolveSceneReferences(): void {
    const requireNode = (current: Node | null, name: string): Node => {
      const found = current ?? this.node.getChildByName(name);
      if (!found) throw new Error(`[BattleController] missing scene node: ${name}`);
      return found;
    };
    this.boardRoot = requireNode(this.boardRoot, 'BoardRoot');
    this.rangeRoot = requireNode(this.rangeRoot, 'RangeRoot');
    this.unitRoot = requireNode(this.unitRoot, 'UnitRoot');
    this.effectsRoot = requireNode(this.effectsRoot, 'EffectsRoot');
    this.hudRoot = requireNode(this.hudRoot, 'HUDRoot');
    this.overlayRoot = requireNode(this.overlayRoot, 'OverlayRoot');
    this.debugRoot = requireNode(this.debugRoot, 'DebugRoot');
  }
}
