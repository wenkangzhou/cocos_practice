import { Label, Node, UIOpacity, Vec3, tween } from 'cc';
import { GridPosition, UnitModel } from '../core/BattleTypes';
import { GridView } from './GridView';
import { PALETTE } from './Palette';
import { UnitView } from './UnitView';
import { createLabel } from './UIFactory';

export class CombatPresenter {
  public constructor(
    private readonly effectsRoot: Node,
    private readonly gridView: GridView,
    private readonly unitViews: Map<string, UnitView>,
  ) {}

  public async move(unit: UnitModel, path: GridPosition[]): Promise<void> {
    const view = this.unitViews.get(unit.id);
    if (!view) return;
    for (const step of path.slice(1)) {
      await this.tweenPosition(view.node, this.gridView.positionToLocal(step), 0.13);
    }
  }

  public async strike(attacker: UnitModel, defender: UnitModel, damage: number): Promise<void> {
    const attackerView = this.unitViews.get(attacker.id);
    const defenderView = this.unitViews.get(defender.id);
    if (!attackerView || !defenderView) return;
    const start = attackerView.node.position.clone();
    const dx = Math.sign(defenderView.node.position.x - start.x) * 15;
    const dy = Math.sign(defenderView.node.position.y - start.y) * 15;
    await this.tweenPosition(attackerView.node, new Vec3(start.x + dx, start.y + dy, 0), 0.1);
    await this.tweenPosition(attackerView.node, start, 0.11);
    await this.flash(defenderView.node);
    this.damagePopup(defender.position, `-${damage}`, PALETTE.enemy);
  }

  public heal(target: UnitModel, amount: number): void {
    const view = this.unitViews.get(target.id);
    if (view) {
      tween(view.node).to(0.12, { scale: new Vec3(1.18, 1.18, 1) })
        .to(0.18, { scale: Vec3.ONE }).start();
    }
    this.damagePopup(target.position, `+${amount}`, PALETTE.heal);
  }

  public async death(unit: UnitModel): Promise<void> {
    const view = this.unitViews.get(unit.id);
    if (!view) return;
    const opacity = view.node.getComponent(UIOpacity) ?? view.node.addComponent(UIOpacity);
    await new Promise<void>((resolve) => {
      tween(view.node).to(0.35, { scale: new Vec3(0.15, 0.15, 1) }).call(() => resolve()).start();
      tween(opacity).to(0.35, { opacity: 0 }).start();
    });
    view.node.active = false;
  }

  public levelUp(unit: UnitModel): void {
    this.damagePopup(unit.position, `LEVEL ${unit.level}!`, PALETTE.gold, 25);
  }

  private damagePopup(position: GridPosition, text: string, color: import('cc').Color, size = 28): void {
    const label: Label = createLabel(this.effectsRoot, 'DamagePopup', text, size, color, 150, 48);
    label.isBold = true;
    const origin = this.gridView.positionToLocal(position);
    label.node.setPosition(origin.x, origin.y + 14);
    const opacity = label.node.addComponent(UIOpacity);
    tween(label.node).by(0.65, { position: new Vec3(0, 48, 0) }).call(() => label.node.destroy()).start();
    tween(opacity).delay(0.3).to(0.35, { opacity: 0 }).start();
  }

  private flash(node: Node): Promise<void> {
    const opacity = node.getComponent(UIOpacity) ?? node.addComponent(UIOpacity);
    return new Promise((resolve) => {
      tween(opacity).to(0.08, { opacity: 55 }).to(0.08, { opacity: 255 })
        .to(0.08, { opacity: 70 }).to(0.1, { opacity: 255 }).call(() => resolve()).start();
    });
  }

  private tweenPosition(node: Node, position: Vec3, duration: number): Promise<void> {
    return new Promise((resolve) => {
      tween(node).to(duration, { position }).call(() => resolve()).start();
    });
  }
}
