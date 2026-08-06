import {
  _decorator,
  Button,
  Color,
  Component,
  director,
  Graphics,
  Node,
  Vec3,
  tween,
} from 'cc';
import { PALETTE } from './Palette';

const { ccclass, property } = _decorator;

@ccclass('TitleController')
export class TitleController extends Component {
  @property({ type: Node, tooltip: '标题页背景节点' })
  private background: Node | null = null;

  @property({ type: Node, tooltip: '承载标题、按钮等静态 UI 的容器' })
  private titleContent: Node | null = null;

  @property({ type: Graphics, tooltip: '标题下方的装饰分隔线' })
  private rule: Graphics | null = null;

  @property({ type: Button, tooltip: '进入 Chapter01 的开始按钮' })
  private startButton: Button | null = null;

  protected start(): void {
    if (!this.background || !this.titleContent || !this.rule || !this.startButton) {
      console.error('[TitleController] Title.scene 的节点引用尚未配置完整。');
      return;
    }

    const backdrop = this.background.getComponent(Graphics);
    if (!backdrop) {
      console.error('[TitleController] Background 节点缺少 Graphics 组件。');
      return;
    }

    this.drawBackdrop(backdrop);
    this.drawRule(this.rule);
    this.startButton.node.on(Button.EventType.CLICK, this.enterChapter, this);

    this.titleContent.setScale(0.95, 0.95, 1);
    tween(this.titleContent).to(0.55, { scale: Vec3.ONE }).start();
  }

  private enterChapter(): void {
    director.loadScene('Chapter01');
  }

  private drawRule(graphics: Graphics): void {
    graphics.clear();
    graphics.fillColor = PALETTE.gold;
    graphics.roundRect(-240, -1.5, 480, 3, 1.5);
    graphics.fill();
  }

  private drawBackdrop(graphics: Graphics): void {
    graphics.clear();
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
  }
}
