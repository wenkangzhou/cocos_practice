import { _decorator, Color, Component, director, Graphics, UITransform, Vec3, tween } from 'cc';
import { PALETTE } from './Palette';
import { createButton, createLabel, createLayer, createPanel, setPosition } from './UIFactory';

const { ccclass } = _decorator;

@ccclass('TitleController')
export class TitleController extends Component {
  protected start(): void {
    this.drawBackdrop();
    const content = createLayer(this.node, 'TitleContent');
    const eyebrow = createLabel(content, 'Eyebrow', 'ORIGINAL TACTICAL CHRONICLE', 17, PALETTE.gold, 620, 36);
    eyebrow.node.setPosition(0, 168);
    const title = createLabel(content, 'Title', '灰 烬 隘 口', 62, PALETTE.paper, 780, 96);
    title.isBold = true;
    title.node.setPosition(0, 82);
    const rule = setPosition(createPanel(content, 'Rule', 480, 3, PALETTE.gold, PALETTE.transparent, 0), 0, 21);
    const subtitle = createLabel(content, 'Subtitle', '一支三人小队 · 一条被封锁的山路 · 一个必须击破的出口', 21, PALETTE.muted, 760, 50);
    subtitle.node.setPosition(0, -25);
    const start = createButton(content, 'StartGame', '开始游戏', 270, 66, () => director.loadScene('Chapter01'), PALETTE.playerDark);
    start.node.setPosition(0, -125);
    const hint = createLabel(content, 'Hint', '鼠标点击 / 手机触摸 · 建议横屏游玩', 16, PALETTE.muted, 520, 35);
    hint.node.setPosition(0, -190);
    content.setScale(0.95, 0.95, 1);
    tween(content).to(0.55, { scale: Vec3.ONE }).start();
    void rule;
  }

  private drawBackdrop(): void {
    const background = createLayer(this.node, 'Background');
    const graphics = background.addComponent(Graphics);
    graphics.fillColor = PALETTE.ink;
    graphics.rect(-640, -360, 1280, 720);
    graphics.fill();

    graphics.fillColor = new Color(35, 49, 58, 255);
    graphics.moveTo(-640, -220);
    graphics.lineTo(-480, 80);
    graphics.lineTo(-350, -75);
    graphics.lineTo(-170, 165);
    graphics.lineTo(20, -80);
    graphics.lineTo(210, 130);
    graphics.lineTo(420, -45);
    graphics.lineTo(640, 210);
    graphics.lineTo(640, -360);
    graphics.lineTo(-640, -360);
    graphics.close();
    graphics.fill();

    graphics.fillColor = new Color(48, 62, 65, 255);
    graphics.moveTo(-640, -290);
    graphics.lineTo(-420, -25);
    graphics.lineTo(-210, -210);
    graphics.lineTo(40, 45);
    graphics.lineTo(260, -170);
    graphics.lineTo(470, 60);
    graphics.lineTo(640, -95);
    graphics.lineTo(640, -360);
    graphics.lineTo(-640, -360);
    graphics.close();
    graphics.fill();

    graphics.fillColor = PALETTE.goldDark;
    graphics.circle(420, 210, 72);
    graphics.fill();

    const transform = background.getComponent(UITransform);
    if (transform) transform.setContentSize(1280, 720);
  }
}
