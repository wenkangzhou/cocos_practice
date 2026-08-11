import { _decorator, Button, Component, director } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('TitleController')
export class TitleController extends Component {
  @property({ type: Button, tooltip: '进入 Chapter01 的开始按钮' })
  private startButton: Button | null = null;

  protected start(): void {
    if (!this.startButton) {
      console.error('[TitleController] Title.scene 的节点引用尚未配置完整。');
      return;
    }

    this.startButton.node.on(Button.EventType.CLICK, this.enterChapter, this);
  }

  private enterChapter(): void {
    director.loadScene('Chapter01');
  }
}
