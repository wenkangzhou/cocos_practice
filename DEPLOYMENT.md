# Vercel 发布流程

这个项目由 Cocos Creator 3.8.8 本地构建，Vercel 只负责托管已经生成的静态文件。

## 每次发布

1. 在 Cocos Creator 的“构建发布”面板中构建 `Web Desktop`。
2. 点击“运行”，确认标题页和 Chapter01 都正常。
3. 在项目根目录执行：

   ```bash
   npm run prepare:vercel
   ```

4. 提交源码和 `web-dist`，然后推送到 GitHub。

脚本会自动选择 `build/web-desktop` 中最新且包含 `index.html` 的构建，检查启动场景为 `Title.scene`，再更新 `web-dist`。

## 首次导入 Vercel

在 Vercel 中导入 GitHub 仓库。仓库内的 `vercel.json` 已经配置为：

- 不执行在线 Build Command
- 不执行依赖安装
- 发布 `web-dist` 中的静态文件
- 只有 `web-dist` 变化时才创建新部署

Vercel 导入页保持仓库根目录 `./`；Framework Preset 选择 `Other`。生产分支选择实际使用的主分支，通常为 `main`。
