import {
  ChapterDefinition,
  Faction,
  TerrainType as T,
  UnitClass,
} from '../core/BattleTypes';

export const CHAPTER_01: ChapterDefinition = {
  id: 'chapter-01',
  title: '第一章：灰烬隘口',
  subtitle: '穿过烽火未熄的北境山口',
  objective: '击败出口处的守关队长 · 主角岚必须存活',
  width: 12,
  height: 8,
  terrain: [
    [T.Rock, T.Rock, T.Ground, T.Forest, T.Ground, T.Rock, T.Rock, T.Ground, T.Ground, T.Forest, T.Rock, T.Exit],
    [T.Rock, T.Ground, T.Ground, T.Forest, T.Ground, T.Ground, T.Rock, T.Ground, T.Forest, T.Ground, T.Rock, T.Exit],
    [T.Ground, T.Ground, T.Forest, T.Ground, T.Rock, T.Ground, T.Ground, T.Ground, T.Rock, T.Ground, T.Ground, T.Exit],
    [T.Ground, T.Forest, T.Ground, T.Ground, T.Rock, T.Rock, T.Ground, T.Ground, T.Rock, T.Ground, T.Ground, T.Exit],
    [T.Ground, T.Ground, T.Ground, T.Rock, T.Rock, T.Ground, T.Ground, T.Forest, T.Ground, T.Ground, T.Rock, T.Exit],
    [T.Forest, T.Ground, T.Ground, T.Ground, T.Ground, T.Ground, T.Rock, T.Ground, T.Ground, T.Forest, T.Ground, T.Exit],
    [T.Ground, T.Ground, T.Forest, T.Ground, T.Rock, T.Ground, T.Ground, T.Ground, T.Rock, T.Ground, T.Ground, T.Exit],
    [T.Ground, T.Ground, T.Ground, T.Forest, T.Rock, T.Rock, T.Ground, T.Forest, T.Ground, T.Ground, T.Rock, T.Exit],
  ],
  units: [
    {
      id: 'hero-lan', displayName: '岚', faction: Faction.Player, unitClass: UnitClass.Vanguard,
      level: 2, exp: 86, maxHp: 28, attack: 12, defense: 6, move: 5,
      minRange: 1, maxRange: 1, position: { x: 1, y: 5 }, isLeader: true,
    },
    {
      id: 'archer-qiu', displayName: '秋弦', faction: Faction.Player, unitClass: UnitClass.Archer,
      level: 2, exp: 28, maxHp: 22, attack: 14, defense: 3, move: 5,
      minRange: 2, maxRange: 2, position: { x: 0, y: 6 },
    },
    {
      id: 'healer-sui', displayName: '穗灯', faction: Faction.Player, unitClass: UnitClass.Healer,
      level: 2, exp: 40, maxHp: 21, attack: 8, defense: 3, move: 5,
      minRange: 0, maxRange: 0, position: { x: 1, y: 7 },
    },
    {
      id: 'raider-1', displayName: '峡口刀兵', faction: Faction.Enemy, unitClass: UnitClass.Raider,
      level: 1, exp: 0, maxHp: 20, attack: 10, defense: 4, move: 4,
      minRange: 1, maxRange: 1, position: { x: 6, y: 2 },
    },
    {
      id: 'raider-2', displayName: '岩径刀兵', faction: Faction.Enemy, unitClass: UnitClass.Raider,
      level: 1, exp: 0, maxHp: 21, attack: 10, defense: 4, move: 4,
      minRange: 1, maxRange: 1, position: { x: 7, y: 6 },
    },
    {
      id: 'enemy-archer', displayName: '灰羽弓手', faction: Faction.Enemy, unitClass: UnitClass.Archer,
      level: 2, exp: 0, maxHp: 19, attack: 12, defense: 3, move: 4,
      minRange: 2, maxRange: 2, position: { x: 9, y: 1 },
    },
    {
      id: 'boss-tuo', displayName: '队长·拓崖', faction: Faction.Enemy, unitClass: UnitClass.Captain,
      level: 4, exp: 0, maxHp: 34, attack: 14, defense: 8, move: 0,
      minRange: 1, maxRange: 1, position: { x: 11, y: 3 }, isBoss: true,
    },
  ],
  dialogue: [
    { speaker: '岚', text: '山风里有焦木味……灰烬隘口果然已经落入他们手中。', side: 'left' },
    { speaker: '秋弦', text: '出口就在东面。四名守军，领头的披着黑铜甲。', side: 'right' },
    { speaker: '穗灯', text: '我会守住大家的伤口。别被岩壁分散了。', side: 'left' },
    { speaker: '岚', text: '击溃队长，打开隘口。我们一起穿过去。', side: 'right' },
  ],
};
