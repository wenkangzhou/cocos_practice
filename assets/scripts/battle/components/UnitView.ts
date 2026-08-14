import { EventTouch, Graphics, Label, Node, Sprite, UIOpacity } from 'cc';
import { Faction, UnitClass, UnitModel } from '../core/BattleTypes';
import { GridView } from './GridView';
import { PALETTE } from './Palette';
import { addTransform, createLabel } from './UIFactory';
import { loadUnitPortrait } from './PortraitAssets';

export class UnitView {
  public readonly node: Node;
  private readonly graphics: Graphics;
  private readonly hpGraphics: Graphics;
  private readonly idLabel: Label;
  private readonly glyph: Label;
  private selected = false;

  public constructor(
    parent: Node,
    public readonly model: UnitModel,
    private readonly gridView: GridView,
    onPressed: (unit: UnitModel) => void,
  ) {
    this.node = new Node(`Unit_${model.id}`);
    this.node.layer = parent.layer;
    addTransform(this.node, 54, 62);
    this.node.setPosition(this.gridView.positionToLocal(model.position));
    parent.addChild(this.node);
    this.graphics = this.node.addComponent(Graphics);

    const portraitNode = new Node('Portrait');
    portraitNode.layer = parent.layer;
    addTransform(portraitNode, 40, 40);
    portraitNode.setPosition(0, 4);
    this.node.addChild(portraitNode);
    const portrait = portraitNode.addComponent(Sprite);
    portrait.sizeMode = Sprite.SizeMode.CUSTOM;

    this.glyph = createLabel(this.node, 'Glyph', this.classGlyph(), 19, PALETTE.paper, 38, 32);
    this.glyph.node.setPosition(0, 5);
    this.glyph.isBold = true;
    const name = createLabel(this.node, 'Name', model.displayName, model.isBoss ? 13 : 12, PALETTE.paper, 76, 20);
    name.node.setPosition(0, 29);
    name.isBold = true;

    const hpNode = new Node('HpBar');
    hpNode.layer = parent.layer;
    addTransform(hpNode, 46, 7);
    hpNode.setPosition(0, -25);
    this.node.addChild(hpNode);
    this.hpGraphics = hpNode.addComponent(Graphics);

    this.idLabel = createLabel(this.node, 'UnitId', model.id, 9, PALETTE.paper, 84, 16);
    this.idLabel.node.setPosition(0, -37);
    this.idLabel.node.active = false;
    this.node.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
      event.propagationStopped = true;
      onPressed(this.model);
    });
    loadUnitPortrait(model, (spriteFrame) => {
      if (!spriteFrame || !this.node.isValid) return;
      portrait.spriteFrame = spriteFrame;
      this.glyph.node.active = false;
    });
    this.redraw();
  }

  public redraw(): void {
    this.graphics.clear();
    const base = this.model.isBoss
      ? PALETTE.boss
      : this.model.faction === Faction.Player
        ? PALETTE.player
        : PALETTE.enemy;
    const dark = this.model.faction === Faction.Player ? PALETTE.playerDark : PALETTE.enemyDark;
    this.graphics.fillColor = dark;
    if (this.model.unitClass === UnitClass.Archer) {
      this.graphics.moveTo(0, 27);
      this.graphics.lineTo(25, 0);
      this.graphics.lineTo(0, -27);
      this.graphics.lineTo(-25, 0);
      this.graphics.close();
      this.graphics.fill();
    } else {
      this.graphics.circle(0, 0, this.model.isBoss ? 27 : 24);
      this.graphics.fill();
    }
    this.graphics.fillColor = base;
    this.graphics.circle(0, 0, this.model.isBoss ? 21 : 18);
    this.graphics.fill();
    this.graphics.lineWidth = this.selected ? 4 : 2;
    this.graphics.strokeColor = this.selected ? PALETTE.path : PALETTE.paper;
    this.graphics.circle(0, 0, this.model.isBoss ? 27 : 24);
    this.graphics.stroke();

    this.hpGraphics.clear();
    this.hpGraphics.fillColor = PALETTE.ink;
    this.hpGraphics.roundRect(-23, -3.5, 46, 7, 3);
    this.hpGraphics.fill();
    const ratio = Math.max(0, this.model.hp / this.model.maxHp);
    this.hpGraphics.fillColor = ratio > 0.5 ? PALETTE.heal : ratio > 0.25 ? PALETTE.gold : PALETTE.enemy;
    this.hpGraphics.roundRect(-22, -2.5, 44 * ratio, 5, 2);
    this.hpGraphics.fill();
    const opacity = this.node.getComponent(UIOpacity) ?? this.node.addComponent(UIOpacity);
    opacity.opacity = this.model.acted ? 125 : 255;
  }

  public syncPosition(): void {
    this.node.setPosition(this.gridView.positionToLocal(this.model.position));
  }

  public setSelected(value: boolean): void {
    this.selected = value;
    this.redraw();
  }

  public setIdVisible(value: boolean): void {
    this.idLabel.node.active = value;
  }

  private classGlyph(): string {
    switch (this.model.unitClass) {
      case UnitClass.Archer: return '弓';
      case UnitClass.Healer: return '愈';
      case UnitClass.Captain: return '将';
      case UnitClass.Raider: return '刀';
      default: return '剑';
    }
  }
}
