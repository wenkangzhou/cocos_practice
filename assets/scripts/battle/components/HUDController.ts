import { Color, Label, Node, UIOpacity, Vec3, tween } from 'cc';
import {
  CombatForecast,
  DialogueLine,
  Faction,
  GridPosition,
  UnitClass,
  UnitModel,
} from '../core/BattleTypes';
import { TerrainDefinition } from '../core/BattleTypes';
import { PALETTE } from './Palette';
import {
  ButtonHandle,
  clearChildren,
  createButton,
  createLabel,
  createPanel,
  setPosition,
} from './UIFactory';

export interface DebugCallbacks {
  toggleCoordinates(): void;
  toggleIds(): void;
  switchTurn(): void;
  changeHp(delta: number): void;
  victory(): void;
  defeat(): void;
  reset(): void;
}

export class HUDController {
  private readonly turnLabel: Label;
  private readonly objectiveLabel: Label;
  private readonly unitInfo: Label;
  private readonly terrainInfo: Label;
  private readonly actionRoot: Node;
  private readonly modalRoot: Node;
  private readonly bannerRoot: Node;
  private readonly debugPanel: Node;
  private readonly toastLabel: Label;
  private endTurnButton: ButtonHandle;

  public constructor(
    private readonly hudRoot: Node,
    private readonly overlayRoot: Node,
    private readonly debugRoot: Node,
    onEndTurn: () => void,
    debugCallbacks: DebugCallbacks,
    debugEnabled: boolean,
  ) {
    const topBar = setPosition(createPanel(
      hudRoot,
      'TopBar',
      1228,
      66,
      PALETTE.inkSoft,
      PALETTE.goldDark,
      5,
    ), 0, 319);
    const chapter = createLabel(topBar, 'Chapter', '第一章：灰烬隘口', 25, PALETTE.gold, 340, 48, 0);
    chapter.isBold = true;
    chapter.node.setPosition(-424, 0);
    this.objectiveLabel = createLabel(topBar, 'Objective', '', 18, PALETTE.paper, 590, 48, 0);
    this.objectiveLabel.node.setPosition(35, 0);
    this.turnLabel = createLabel(topBar, 'Turn', 'PLAYER PHASE', 20, PALETTE.player, 230, 48);
    this.turnLabel.isBold = true;
    this.turnLabel.node.setPosition(490, 0);

    const side = setPosition(createPanel(hudRoot, 'SidePanel', 410, 566, PALETTE.panel, PALETTE.goldDark), 413, 0);
    const infoTitle = createLabel(side, 'InfoTitle', '战 况', 21, PALETTE.gold, 370, 34);
    infoTitle.node.setPosition(0, 249);
    this.unitInfo = createLabel(side, 'UnitInfo', '选择一名友军开始行动', 19, PALETTE.paper, 356, 150, 0);
    this.unitInfo.node.setPosition(0, 155);
    this.unitInfo.overflow = Label.Overflow.SHRINK;
    this.terrainInfo = createLabel(side, 'TerrainInfo', '地形：—', 17, PALETTE.muted, 356, 74, 0);
    this.terrainInfo.node.setPosition(0, 50);

    this.actionRoot = new Node('ActionRoot');
    this.actionRoot.layer = side.layer;
    side.addChild(this.actionRoot);
    this.actionRoot.setPosition(0, -90);

    this.endTurnButton = createButton(side, 'EndTurn', '结束回合', 168, 48, onEndTurn, PALETTE.enemyDark);
    this.endTurnButton.node.setPosition(0, -242);

    this.modalRoot = new Node('ModalRoot');
    this.modalRoot.layer = overlayRoot.layer;
    overlayRoot.addChild(this.modalRoot);
    this.bannerRoot = new Node('BannerRoot');
    this.bannerRoot.layer = overlayRoot.layer;
    overlayRoot.addChild(this.bannerRoot);

    this.toastLabel = createLabel(overlayRoot, 'Toast', '', 20, PALETTE.paper, 520, 50);
    this.toastLabel.node.setPosition(0, -310);
    this.toastLabel.node.active = false;

    this.debugPanel = this.createDebugPanel(debugCallbacks);
    this.debugPanel.active = false;
    if (debugEnabled) {
      const debugToggle = createButton(hudRoot, 'DebugToggle', '调试', 74, 34, () => {
        this.debugPanel.active = !this.debugPanel.active;
      }, PALETTE.panelLight);
      debugToggle.node.setPosition(578, 273);
    }
  }

  public setObjective(text: string): void {
    this.objectiveLabel.string = `目标｜${text}`;
  }

  public setTurn(round: number, faction: Faction): void {
    const player = faction === Faction.Player;
    this.turnLabel.string = `${player ? 'PLAYER' : 'ENEMY'} PHASE · ${round}`;
    this.turnLabel.color = player ? PALETTE.player : PALETTE.enemy;
    this.endTurnButton.setEnabled(player);
  }

  public showUnit(unit?: UnitModel): void {
    if (!unit) {
      this.unitInfo.string = '选择一名尚未行动的友军\n点击蓝色格子规划移动路径';
      return;
    }
    const status = unit.acted ? '已行动' : '可行动';
    const range = unit.unitClass === UnitClass.Healer
      ? '相邻治疗'
      : unit.minRange === unit.maxRange
        ? `射程 ${unit.minRange}`
        : `射程 ${unit.minRange}-${unit.maxRange}`;
    this.unitInfo.string = [
      `${unit.displayName}  ·  ${unit.unitClass}  Lv.${unit.level}`,
      `HP  ${unit.hp} / ${unit.maxHp}     EXP  ${unit.exp} / 100`,
      `攻击 ${unit.attack}   防御 ${unit.defense}   移动 ${unit.move}`,
      `${range}  ·  ${status}`,
    ].join('\n');
  }

  public showTerrain(terrain: TerrainDefinition, position: GridPosition): void {
    this.terrainInfo.string = [
      `地形｜${terrain.name}   坐标 ${position.x},${position.y}`,
      terrain.passable
        ? `移动消耗 ${terrain.moveCost}   防御 +${terrain.defenseBonus}`
        : '不可通行',
    ].join('\n');
  }

  public showMoveConfirm(
    position: GridPosition,
    cost: number,
    onConfirm: () => void,
    onCancel: () => void,
  ): void {
    this.actionPanel('确认移动', `目的地 ${position.x},${position.y} · 消耗 ${cost}`, [
      { text: '移动到此', callback: onConfirm, color: PALETTE.playerDark },
      { text: '返回', callback: onCancel, color: PALETTE.panelLight },
    ]);
  }

  public showActionMenu(
    unit: UnitModel,
    canUsePrimary: boolean,
    onPrimary: () => void,
    onWait: () => void,
    onCancel: () => void,
  ): void {
    const primary = unit.unitClass === UnitClass.Healer ? '治疗' : '攻击';
    const panel = this.actionPanel('选择行动', `${unit.displayName} 已到达目的地`, [
      { text: primary, callback: onPrimary, color: unit.unitClass === UnitClass.Healer ? PALETTE.heal : PALETTE.enemyDark, enabled: canUsePrimary },
      { text: '待机', callback: onWait, color: PALETTE.playerDark },
      { text: '取消移动', callback: onCancel, color: PALETTE.panelLight },
    ]);
    const primaryButton = panel.children.find((child) => child.name === 'Action_0');
    if (!canUsePrimary && primaryButton) {
      const hint = createLabel(panel, 'UnavailableHint', `附近没有可${primary}目标`, 13, PALETTE.muted, 290, 24);
      hint.node.setPosition(0, -92);
    }
  }

  public clearActionMenu(): void {
    clearChildren(this.actionRoot);
  }

  public showTargetCancel(mode: 'attack' | 'heal', onCancel: () => void): void {
    this.actionPanel(
      mode === 'attack' ? '选择攻击目标' : '选择治疗目标',
      mode === 'attack' ? '红色格：合法攻击距离' : '绿色格：相邻受伤友军',
      [{ text: '取消并返回', callback: onCancel, color: PALETTE.panelLight }],
    );
  }

  public showCombatPreview(
    attacker: UnitModel,
    defender: UnitModel,
    forecast: CombatForecast,
    onConfirm: () => void,
    onCancel: () => void,
  ): void {
    clearChildren(this.modalRoot);
    const panel = setPosition(createPanel(this.modalRoot, 'CombatPreview', 610, 330, PALETTE.inkSoft, PALETTE.gold), 0, 0);
    const title = createLabel(panel, 'Title', '交 战 预 览', 26, PALETTE.gold, 560, 44);
    title.isBold = true;
    title.node.setPosition(0, 125);
    const counter = forecast.canCounter
      ? `反击 ${forecast.counterDamage}  →  ${attacker.displayName} HP ${attacker.hp} → ${forecast.attackerHpAfter}`
      : '目标无法反击';
    const body = createLabel(panel, 'Body', [
      `${attacker.displayName}  ${attacker.hp}/${attacker.maxHp} HP      VS      ${defender.displayName}  ${defender.hp}/${defender.maxHp} HP`,
      `必定命中  ·  距离 ${forecast.distance}`,
      `预计伤害 ${forecast.damage}  →  ${defender.displayName} HP ${defender.hp} → ${forecast.defenderHpAfter}`,
      counter,
    ].join('\n'), 20, PALETTE.paper, 540, 150);
    body.node.setPosition(0, 26);
    const confirm = createButton(panel, 'Confirm', '确认攻击', 190, 48, onConfirm, PALETTE.enemyDark);
    confirm.node.setPosition(-112, -120);
    const cancel = createButton(panel, 'Cancel', '返回选目标', 190, 48, onCancel, PALETTE.panelLight);
    cancel.node.setPosition(112, -120);
  }

  public showHealPreview(
    healer: UnitModel,
    target: UnitModel,
    amount: number,
    onConfirm: () => void,
    onCancel: () => void,
  ): void {
    clearChildren(this.modalRoot);
    const panel = setPosition(createPanel(this.modalRoot, 'HealPreview', 530, 270, PALETTE.inkSoft, PALETTE.heal), 0, 0);
    const title = createLabel(panel, 'Title', '治 疗 预 览', 26, PALETTE.heal, 480, 42);
    title.node.setPosition(0, 92);
    const body = createLabel(panel, 'Body', [
      `${healer.displayName}  →  ${target.displayName}`,
      `恢复 ${amount} HP`,
      `${target.hp} / ${target.maxHp}  →  ${target.hp + amount} / ${target.maxHp}`,
    ].join('\n'), 21, PALETTE.paper, 460, 110);
    body.node.setPosition(0, 15);
    const confirm = createButton(panel, 'Confirm', '确认治疗', 170, 46, onConfirm, PALETTE.heal);
    confirm.node.setPosition(-100, -91);
    const cancel = createButton(panel, 'Cancel', '返回', 170, 46, onCancel, PALETTE.panelLight);
    cancel.node.setPosition(100, -91);
  }

  public clearModal(): void {
    clearChildren(this.modalRoot);
  }

  public showDialogue(lines: DialogueLine[], onComplete: () => void): void {
    clearChildren(this.modalRoot);
    const shade = setPosition(createPanel(this.modalRoot, 'DialogueShade', 1280, 720, new Color(6, 9, 12, 150), PALETTE.transparent, 0), 0, 0);
    const panel = setPosition(createPanel(shade, 'Dialogue', 1030, 190, PALETTE.inkSoft, PALETTE.gold), 0, -205);
    const speaker = createLabel(panel, 'Speaker', '', 25, PALETTE.gold, 240, 42, 0);
    speaker.isBold = true;
    speaker.node.setPosition(-365, 58);
    const body = createLabel(panel, 'Body', '', 23, PALETTE.paper, 890, 92, 0);
    body.node.setPosition(0, -2);
    const advance = createButton(panel, 'Advance', '继续 ▶', 140, 38, () => next(), PALETTE.playerDark);
    advance.node.setPosition(420, -67);
    let index = 0;
    const next = (): void => {
      if (index >= lines.length) {
        this.clearModal();
        onComplete();
        return;
      }
      const line = lines[index++];
      speaker.string = line.speaker;
      speaker.node.setPosition(line.side === 'left' ? -365 : 365, 58);
      speaker.horizontalAlign = line.side === 'left' ? Label.HorizontalAlign.LEFT : Label.HorizontalAlign.RIGHT;
      body.string = line.text;
      advance.setText(index === lines.length ? '出击 ▶' : '继续 ▶');
    };
    next();
  }

  public async showBanner(text: string, faction: Faction): Promise<void> {
    clearChildren(this.bannerRoot);
    const panel = setPosition(createPanel(
      this.bannerRoot,
      'PhaseBanner',
      520,
      86,
      faction === Faction.Player ? PALETTE.playerDark : PALETTE.enemyDark,
      PALETTE.paper,
      5,
    ), 0, 30);
    panel.setScale(0.75, 0.75, 1);
    const label = createLabel(panel, 'Label', text, 32, PALETTE.paper, 480, 70);
    label.isBold = true;
    const opacity = panel.addComponent(UIOpacity);
    await new Promise<void>((resolve) => {
      tween(panel).to(0.18, { scale: Vec3.ONE }).delay(0.62).to(0.2, { scale: new Vec3(1.08, 1.08, 1) }).start();
      tween(opacity).delay(0.65).to(0.35, { opacity: 0 }).call(() => {
        panel.destroy();
        resolve();
      }).start();
    });
  }

  public showBossLine(text: string): Promise<void> {
    clearChildren(this.bannerRoot);
    const panel = setPosition(createPanel(this.bannerRoot, 'BossLine', 690, 106, PALETTE.inkSoft, PALETTE.boss), 0, 15);
    const label = createLabel(panel, 'Line', `队长·拓崖：${text}`, 22, PALETTE.paper, 630, 80);
    return new Promise((resolve) => {
      tween(panel).delay(1.3).call(() => {
        panel.destroy();
        resolve();
      }).start();
    });
  }

  public showResult(
    victory: boolean,
    round: number,
    onRetry: () => void,
    onTitle: () => void,
  ): void {
    clearChildren(this.modalRoot);
    const shade = setPosition(createPanel(this.modalRoot, 'ResultShade', 1280, 720, new Color(4, 7, 10, 195), PALETTE.transparent, 0), 0, 0);
    const panel = setPosition(createPanel(shade, 'ResultPanel', 610, 380, PALETTE.inkSoft, victory ? PALETTE.gold : PALETTE.enemy), 0, 0);
    const title = createLabel(panel, 'Title', victory ? '隘 口 已 破' : '小 队 溃 败', 40, victory ? PALETTE.gold : PALETTE.enemy, 540, 70);
    title.isBold = true;
    title.node.setPosition(0, 115);
    const body = createLabel(panel, 'Body', victory
      ? `守关队长已经倒下。\n通往北境的道路重新打开。\n\n完成回合：${round}`
      : `主角岚倒在灰烬隘口。\n整顿阵形，再尝试一次。\n\n坚持回合：${round}`,
    22, PALETTE.paper, 500, 150);
    body.node.setPosition(0, 15);
    const retry = createButton(panel, 'Retry', '重新开始本关', 210, 52, onRetry, PALETTE.playerDark);
    retry.node.setPosition(-125, -125);
    const titleButton = createButton(panel, 'TitleButton', '返回标题', 180, 52, onTitle, PALETTE.panelLight);
    titleButton.node.setPosition(125, -125);
  }

  public toast(text: string): void {
    this.toastLabel.node.active = true;
    this.toastLabel.string = text;
    const opacity = this.toastLabel.node.getComponent(UIOpacity) ?? this.toastLabel.node.addComponent(UIOpacity);
    opacity.opacity = 255;
    tween(opacity).delay(1.1).to(0.35, { opacity: 0 }).call(() => {
      this.toastLabel.node.active = false;
    }).start();
  }

  private actionPanel(
    title: string,
    subtitle: string,
    actions: { text: string; callback: () => void; color: Color; enabled?: boolean }[],
  ): Node {
    clearChildren(this.actionRoot);
    const panel = createPanel(this.actionRoot, 'ActionPanel', 350, 238, PALETTE.inkSoft, PALETTE.goldDark);
    const heading = createLabel(panel, 'Title', title, 22, PALETTE.gold, 310, 35);
    heading.node.setPosition(0, 91);
    const hint = createLabel(panel, 'Subtitle', subtitle, 14, PALETTE.muted, 310, 30);
    hint.node.setPosition(0, 62);
    actions.forEach((action, index) => {
      const button = createButton(panel, `Action_${index}`, action.text, 278, 40, action.callback, action.color);
      button.node.setPosition(0, 25 - index * 49);
      button.setEnabled(action.enabled ?? true);
    });
    return panel;
  }

  private createDebugPanel(callbacks: DebugCallbacks): Node {
    const panel = setPosition(createPanel(this.debugRoot, 'DebugPanel', 308, 375, PALETTE.inkSoft, PALETTE.heal), -466, 80);
    const title = createLabel(panel, 'Title', '开发调试面板', 20, PALETTE.heal, 270, 35);
    title.node.setPosition(0, 157);
    const actions: [string, () => void][] = [
      ['切换网格坐标', callbacks.toggleCoordinates],
      ['切换单位 ID', callbacks.toggleIds],
      ['切换玩家 / 敌方回合', callbacks.switchTurn],
      ['选中单位 HP +5', () => callbacks.changeHp(5)],
      ['选中单位 HP -5', () => callbacks.changeHp(-5)],
      ['直接胜利', callbacks.victory],
      ['直接失败', callbacks.defeat],
      ['重置关卡', callbacks.reset],
    ];
    actions.forEach(([text, callback], index) => {
      const button = createButton(panel, `Debug_${index}`, text, 250, 34, callback, PALETTE.panelLight);
      button.node.setPosition(0, 118 - index * 39);
    });
    return panel;
  }
}
