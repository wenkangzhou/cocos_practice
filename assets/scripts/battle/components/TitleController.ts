import {
  _decorator,
  Button,
  Component,
  director,
  Node,
  Vec3,
  tween,
} from 'cc';

const { ccclass, property } = _decorator;

@ccclass('TitleController')
export class TitleController extends Component {
  @property({ type: Node, tooltip: '承载标题、按钮等静态 UI 的容器' })
  private titleContent: Node | null = null;

  @property({ type: Button, tooltip: '进入 Chapter01 的开始按钮' })
  private startButton: Button | null = null;

  protected start(): void {
    if (!this.titleContent || !this.startButton) {
      console.error('[TitleController] Title.scene 的节点引用尚未配置完整。');
      return;
    }

    this.startButton.node.on(Button.EventType.CLICK, this.enterChapter, this);

    this.titleContent.setScale(0.95, 0.95, 1);
    tween(this.titleContent).to(0.55, { scale: Vec3.ONE }).start();
  }

  private enterChapter(): void {
    director.loadScene('Chapter01');
  }
}
