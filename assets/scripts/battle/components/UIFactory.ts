import {
  Color,
  EventTouch,
  Graphics,
  Label,
  Node,
  UITransform,
  Vec3,
} from 'cc';
import { PALETTE } from './Palette';

export interface ButtonHandle {
  node: Node;
  setEnabled(enabled: boolean): void;
  setText(text: string): void;
}

export function addTransform(node: Node, width: number, height: number): UITransform {
  const transform = node.getComponent(UITransform) ?? node.addComponent(UITransform);
  transform.setContentSize(width, height);
  return transform;
}

export function createLayer(parent: Node, name: string, width = 1280, height = 720): Node {
  const node = new Node(name);
  node.layer = parent.layer;
  addTransform(node, width, height);
  parent.addChild(node);
  return node;
}

export function createPanel(
  parent: Node,
  name: string,
  width: number,
  height: number,
  color = PALETTE.panel,
  border = PALETTE.goldDark,
  radius = 10,
): Node {
  const node = createLayer(parent, name, width, height);
  const graphics = node.addComponent(Graphics);
  graphics.fillColor = color;
  graphics.roundRect(-width / 2, -height / 2, width, height, radius);
  graphics.fill();
  graphics.lineWidth = 2;
  graphics.strokeColor = border;
  graphics.roundRect(-width / 2, -height / 2, width, height, radius);
  graphics.stroke();
  return node;
}

export function createLabel(
  parent: Node,
  name: string,
  text: string,
  fontSize: number,
  color = PALETTE.paper,
  width = 300,
  height = 48,
  align: 0 | 1 | 2 = 1,
): Label {
  const node = createLayer(parent, name, width, height);
  const label = node.addComponent(Label);
  label.string = text;
  label.fontSize = fontSize;
  label.lineHeight = Math.round(fontSize * 1.25);
  label.color = color;
  label.horizontalAlign = align;
  label.verticalAlign = Label.VerticalAlign.CENTER;
  label.overflow = Label.Overflow.SHRINK;
  return label;
}

export function createButton(
  parent: Node,
  name: string,
  text: string,
  width: number,
  height: number,
  onClick: () => void,
  accent = PALETTE.gold,
): ButtonHandle {
  const node = createLayer(parent, name, width, height);
  const graphics = node.addComponent(Graphics);
  const label = createLabel(node, 'Label', text, 21, PALETTE.paper, width - 16, height - 4);
  let enabled = true;
  let pressed = false;

  const redraw = (): void => {
    graphics.clear();
    const fill = !enabled
      ? new Color(62, 68, 72, 220)
      : pressed
        ? new Color(
          Math.max(0, accent.r - 45),
          Math.max(0, accent.g - 45),
          Math.max(0, accent.b - 45),
          255,
        )
        : accent;
    graphics.fillColor = fill;
    graphics.roundRect(-width / 2, -height / 2, width, height, 8);
    graphics.fill();
    graphics.lineWidth = 2;
    graphics.strokeColor = enabled ? PALETTE.paper : PALETTE.muted;
    graphics.roundRect(-width / 2, -height / 2, width, height, 8);
    graphics.stroke();
    label.color = enabled ? PALETTE.paper : PALETTE.muted;
  };

  node.on(Node.EventType.TOUCH_START, () => {
    if (enabled) {
      pressed = true;
      redraw();
    }
  });
  node.on(Node.EventType.TOUCH_CANCEL, () => {
    pressed = false;
    redraw();
  });
  node.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
    event.propagationStopped = true;
    pressed = false;
    redraw();
    if (enabled) {
      onClick();
    }
  });
  redraw();
  return {
    node,
    setEnabled(value: boolean): void {
      enabled = value;
      redraw();
    },
    setText(value: string): void {
      label.string = value;
    },
  };
}

export function setPosition(node: Node, x: number, y: number, z = 0): Node {
  node.setPosition(new Vec3(x, y, z));
  return node;
}

export function clearChildren(node: Node): void {
  for (const child of node.children.slice()) {
    child.destroy();
  }
}
