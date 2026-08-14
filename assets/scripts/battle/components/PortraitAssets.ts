import { SpriteFrame, resources } from 'cc';
import { UnitClass, UnitModel } from '../core/BattleTypes';

const PORTRAIT_KEYS: Record<string, string> = {
  'hero-lan': 'hero-lan',
  'archer-qiu': 'archer-qiu',
  'healer-sui': 'healer-sui',
  'raider-1': 'raider',
  'raider-2': 'raider',
  'enemy-archer': 'enemy-archer',
  'boss-tuo': 'boss-tuo',
};

function fallbackKey(unit: UnitModel): string {
  switch (unit.unitClass) {
    case UnitClass.Archer: return unit.faction === 'player' ? 'archer-qiu' : 'enemy-archer';
    case UnitClass.Healer: return 'healer-sui';
    case UnitClass.Captain: return 'boss-tuo';
    case UnitClass.Raider: return 'raider';
    default: return 'hero-lan';
  }
}

export function loadUnitPortrait(
  unit: UnitModel,
  onLoaded: (portrait?: SpriteFrame) => void,
): void {
  const key = PORTRAIT_KEYS[unit.id] ?? fallbackKey(unit);
  resources.load(`portraits/${key}/spriteFrame`, SpriteFrame, (error, portrait) => {
    if (error) {
      console.warn(`[Portrait] 无法加载 ${key}`, error);
      onLoaded();
      return;
    }
    onLoaded(portrait);
  });
}
