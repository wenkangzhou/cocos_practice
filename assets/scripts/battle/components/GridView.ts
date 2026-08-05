import { EventTouch, Graphics, Label, Node, UITransform, Vec3 } from 'cc';
import { GridModel } from '../core/GridModel';
import { GridPosition, TerrainType, posKey } from '../core/BattleTypes';
import { PALETTE } from './Palette';
import { addTransform, createLabel } from './UIFactory';

export class GridView {
  public static readonly TILE_SIZE = 56;

  private readonly markers = new Map<string, Node>();
  private readonly coordinateLabels: Label[] = [];

  public constructor(
    private readonly tileRoot: Node,
    private readonly markerRoot: Node,
    private readonly grid: GridModel,
    private readonly onTilePressed: (position: GridPosition) => void,
  ) {}

  public build(): void {
    for (let y = 0; y < this.grid.height; y += 1) {
      for (let x = 0; x < this.grid.width; x += 1) {
        const position = { x, y };
        const node = new Node(`Tile_${x}_${y}`);
        node.layer = this.tileRoot.layer;
        addTransform(node, GridView.TILE_SIZE - 1, GridView.TILE_SIZE - 1);
        node.setPosition(this.positionToLocal(position));
        this.tileRoot.addChild(node);
        this.drawTerrain(node, position);
        const coordinate = createLabel(
          node,
          'Coordinate',
          `${x},${y}`,
          11,
          PALETTE.paper,
          46,
          18,
          0,
        );
        coordinate.node.setPosition(-2, -17);
        coordinate.node.active = false;
        this.coordinateLabels.push(coordinate);
        node.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
          event.propagationStopped = true;
          this.onTilePressed(position);
        });
      }
    }
  }

  public positionToLocal(position: GridPosition): Vec3 {
    return new Vec3(
      position.x * GridView.TILE_SIZE + GridView.TILE_SIZE / 2,
      (this.grid.height - 1 - position.y) * GridView.TILE_SIZE + GridView.TILE_SIZE / 2,
      0,
    );
  }

  public showRange(positions: GridPosition[], kind: 'move' | 'attack' | 'heal'): void {
    this.clearMarkers();
    const color = kind === 'move'
      ? PALETTE.moveRange
      : kind === 'attack'
        ? PALETTE.attackRange
        : PALETTE.healRange;
    for (const position of positions) {
      this.addMarker(position, color, kind);
    }
  }

  public showPath(path: GridPosition[]): void {
    for (const [key, marker] of this.markers) {
      if (marker.name.startsWith('Path')) {
        marker.destroy();
        this.markers.delete(key);
      }
    }
    path.forEach((position, index) => {
      const node = new Node(`Path_${index}`);
      node.layer = this.markerRoot.layer;
      addTransform(node, GridView.TILE_SIZE - 14, GridView.TILE_SIZE - 14);
      node.setPosition(this.positionToLocal(position));
      const graphics = node.addComponent(Graphics);
      graphics.fillColor = PALETTE.path;
      graphics.circle(0, 0, index === path.length - 1 ? 13 : 7);
      graphics.fill();
      if (index > 0) {
        graphics.lineWidth = 4;
        graphics.strokeColor = PALETTE.path;
        const previous = this.positionToLocal(path[index - 1]);
        const current = this.positionToLocal(position);
        graphics.moveTo(previous.x - current.x, previous.y - current.y);
        graphics.lineTo(0, 0);
        graphics.stroke();
      }
      this.markerRoot.addChild(node);
      this.markers.set(`path-${index}`, node);
    });
  }

  public clearMarkers(): void {
    for (const marker of this.markers.values()) {
      marker.destroy();
    }
    this.markers.clear();
  }

  public setCoordinatesVisible(visible: boolean): void {
    this.coordinateLabels.forEach((label) => {
      label.node.active = visible;
    });
  }

  private addMarker(position: GridPosition, color: import('cc').Color, kind: string): void {
    const key = `${kind}-${posKey(position)}`;
    const node = new Node(`Range_${kind}_${position.x}_${position.y}`);
    node.layer = this.markerRoot.layer;
    addTransform(node, GridView.TILE_SIZE - 5, GridView.TILE_SIZE - 5);
    node.setPosition(this.positionToLocal(position));
    const graphics = node.addComponent(Graphics);
    graphics.fillColor = color;
    graphics.roundRect(
      -(GridView.TILE_SIZE - 5) / 2,
      -(GridView.TILE_SIZE - 5) / 2,
      GridView.TILE_SIZE - 5,
      GridView.TILE_SIZE - 5,
      4,
    );
    graphics.fill();
    this.markerRoot.addChild(node);
    this.markers.set(key, node);
  }

  private drawTerrain(node: Node, position: GridPosition): void {
    const terrain = this.grid.terrainAt(position);
    const graphics = node.addComponent(Graphics);
    const size = GridView.TILE_SIZE - 1;
    const isAlt = (position.x + position.y) % 2 === 0;
    graphics.fillColor = terrain.type === TerrainType.Ground
      ? isAlt ? PALETTE.ground : PALETTE.groundAlt
      : terrain.type === TerrainType.Forest
        ? PALETTE.forest
        : terrain.type === TerrainType.Rock
          ? PALETTE.rock
          : PALETTE.exit;
    graphics.rect(-size / 2, -size / 2, size, size);
    graphics.fill();
    graphics.lineWidth = 1;
    graphics.strokeColor = PALETTE.ink;
    graphics.rect(-size / 2, -size / 2, size, size);
    graphics.stroke();

    if (terrain.type === TerrainType.Forest) {
      graphics.fillColor = PALETTE.forestLight;
      for (const offset of [-14, 0, 14]) {
        graphics.moveTo(offset, 18);
        graphics.lineTo(offset - 9, -7);
        graphics.lineTo(offset + 9, -7);
        graphics.close();
        graphics.fill();
      }
    } else if (terrain.type === TerrainType.Rock) {
      graphics.fillColor = PALETTE.rockLight;
      graphics.moveTo(-21, -16);
      graphics.lineTo(-10, 18);
      graphics.lineTo(8, 23);
      graphics.lineTo(22, -9);
      graphics.lineTo(8, -22);
      graphics.close();
      graphics.fill();
    } else if (terrain.type === TerrainType.Exit) {
      graphics.lineWidth = 4;
      graphics.strokeColor = PALETTE.gold;
      graphics.moveTo(-15, -20);
      graphics.lineTo(-15, 20);
      graphics.lineTo(15, 20);
      graphics.lineTo(15, -20);
      graphics.stroke();
    }
  }
}
