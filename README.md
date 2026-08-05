# 灰烬隘口：原创战棋垂直切片

使用 Cocos Creator 3.8.8 + TypeScript 制作的原创 12×8 单关战棋游戏。流程包含标题、
四句开场对话、玩家/敌方回合、胜负结算、重开和返回标题，不使用任何现成作品素材。

## 运行

1. 用 Cocos Creator 3.8.8 打开项目根目录。
2. 打开 `assets/scenes/Title.scene` 并预览，或在构建面板选择 Web Desktop。
3. Web 构建入口场景 UUID 为 `c1111111-2222-4333-8444-555555555555`。

命令行构建示例：

```bash
/Applications/Cocos/Creator/3.8.8/CocosCreator.app/Contents/MacOS/CocosCreator \
  --project "$PWD" \
  --build "platform=web-desktop;buildPath=$PWD/build/web-desktop;startScene=c1111111-2222-4333-8444-555555555555"
```

Cocos Creator 3.8 的命令行构建以退出码 `36` 表示成功。构建产物位于
`build/web-desktop/web-desktop/`；该目录已加入 `.gitignore`。

## 操作

- 点击或触摸未行动的友军，查看单位信息和蓝色移动范围。
- 点击蓝色格子预览路径，在右侧确认移动；取消可返回上一步和原位置。
- 剑士、弓手移动后可攻击或待机，治疗者可治疗或待机。
- 红色格为合法攻击目标，绿色格为合法治疗目标；选中目标后会先显示预览。
- 所有友军行动完毕后自动进入敌方回合，也可点击“结束回合”。
- 开发构建右上角的“调试”面板可切换坐标/单位 ID、回合、HP、胜负和重置关卡。

## 关卡规则

- 击败出口处的守关队长“拓崖”胜利；主角“岚”阵亡立即失败。
- 普通地面移动消耗 1；森林消耗 2 并提供 2 点防御；岩壁不可通行。
- 单位不能穿过敌军或停在任意单位占据的格子，友军可以经过但不能重叠停留。
- 剑士攻击距离为 1；弓手攻击距离固定为 2，不能攻击相邻目标。
- 伤害为 `max(1, 攻击 - 防御 - 地形防御)`，默认必中；合法射程内可反击一次。
- 造成伤害和击败敌人会获得经验，达到 100 后固定提升最大生命、攻击和防御。

## 主要结构

```text
assets/
  scenes/
    Title.scene                 标题场景
    Chapter01.scene             战斗场景和预配置分层容器
  scripts/battle/
    core/                       纯规则：模型、网格、寻路、战斗、回合、AI
    data/Chapter01Config.ts     地形、出生点、数值、剧情和胜负配置
    components/                 控制器、HUD、地图/单位 View、战斗表现
    debug/LogicSelfCheck.ts     编辑器开发模式自检
build-templates/web-desktop/    横屏自适应 Web 页面模板
tests/logic-self-check.mjs      无框架纯逻辑回归检查
```

`Chapter01.scene` 中预先配置了 `BoardRoot`、`RangeRoot`、`UnitRoot`、`EffectsRoot`、
`HUDRoot`、`OverlayRoot` 和 `DebugRoot`，并挂载 `BattleController`。格子、单位、范围标记
和伤害数字数量随关卡数据变化，因此由各自职责明确的 View 组件动态创建；本切片没有引入
未被使用的独立 Prefab。

## 验证

```bash
npm run self-check
/Applications/Cocos/Creator/3.8.8/CocosCreator.app/Contents/Resources/app.asar.unpacked/node_modules/typescript/bin/tsc \
  --noEmit -p tsconfig.json
```

自检覆盖地形通行/消耗、Dijkstra 移动范围、敌军阻挡、固定弓箭射程、森林防御伤害、
反击、治疗、经验升级、回合重置、AI 目标优先级和胜负条件。最终 Web 构建还需在浏览器
中从标题到战斗、失败/胜利结算、重开和返回标题各走一次。
