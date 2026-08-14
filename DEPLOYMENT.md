# Cocos Creator → Vercel 发布手册

本项目采用“本地构建、Vercel 托管静态文件”的方式发布：

1. Cocos Creator 在本机生成 Web Desktop 游戏。
2. `npm run prepare:vercel` 把最新构建复制到 `web-dist`。
3. 推送 GitHub 后，Vercel 直接发布 `web-dist`，不会在云端安装 Cocos Creator 或重新构建游戏。

## 日常发布：按这份清单操作

### 1. 保存并检查项目

在 Cocos Creator 中保存当前场景和脚本，等待资源导入完成，并确认控制台没有新的红色错误。

### 2. 构建 Web Desktop

1. 打开顶部的“构建发布”。
2. 找到现有任务 `web-desktop-001`，不需要新建任务。
3. 构建方式保持“正常构建”。
4. 点击“构建”。
5. 等待任务显示绿色的 `build success`。

Creator 可能把产物放在以下任一目录，这是正常的：

- `build/web-desktop-001`
- `build/web-desktop/<任务名>`

发布脚本会从 `build` 下自动选择 `index.html` 修改时间最新的有效构建。

### 3. 本地试玩

在构建任务右侧点击“运行”，至少检查：

- 能看到 Title 标题页；
- 点击“开始游戏”能进入 Chapter01；
- 新增或修改的画面、操作和规则正常；
- 浏览器控制台没有红色报错。

### 4. 运行自检并准备 Vercel 目录

在项目根目录执行：

```bash
npm run self-check
npm run prepare:vercel
```

正常情况下会看到类似结果：

```text
Ashes Pass logic self-check: 12 assertions passed.
Vercel 发布目录已更新：web-dist
来源：build/web-desktop-001
启动场景：db://assets/scenes/Title.scene
```

重点确认两件事：

- “来源”是刚刚生成的构建目录；
- “启动场景”是 `Title.scene`。

不要手动复制 `build` 目录。`prepare:vercel` 会校验必要文件、启动场景，并完整更新 `web-dist`。

### 5. 提交前检查

```bash
git status --short
git diff --stat
```

应该能看到本次源码改动以及 `web-dist` 改动。`build` 是本地临时产物，不应提交；真正交给 Vercel 的目录是 `web-dist`。

如果 `web-dist` 没有变化，先不要推送发布。请检查 Creator 是否真的完成了新构建，以及 `prepare:vercel` 输出的“来源”是否正确。

### 6. 提交并推送

确认 `git status` 中没有不想发布的文件后执行：

```bash
git add -A
git commit -m "build: 发布最新 Web Desktop 版本"
git push origin main
```

如果功能代码已经在前一个提交中，只需确保最新 `web-dist` 也已经提交并推送。

### 7. 在 Vercel 检查结果

1. 打开 Vercel 项目。
2. 在 Deployments 中找到刚才 `main` 分支的提交。
3. 等待状态变成 `Ready`。
4. 打开生产域名，重新走一遍 Title → Chapter01。

如果页面仍像旧版本，先强制刷新浏览器或使用无痕窗口验证，避免浏览器缓存干扰判断。

## 自动部署是怎样触发的

仓库中的 [`vercel.json`](./vercel.json) 包含：

```json
{
  "buildCommand": null,
  "installCommand": null,
  "outputDirectory": "web-dist",
  "ignoreCommand": "git diff HEAD^ HEAD --quiet -- web-dist vercel.json"
}
```

对应规则如下：

| 推送内容 | 分支 | Vercel 结果 |
| --- | --- | --- |
| 包含 `web-dist` 或 `vercel.json` 变化 | `main` | 创建生产部署 |
| 包含 `web-dist` 或 `vercel.json` 变化 | 其他分支 | 创建预览部署 |
| 只有 TypeScript、场景或文档变化，没有更新 `web-dist` | 任意分支 | 跳过部署 |

因此，修改游戏代码后不能只 push 源码。要发布可玩的新版本，必须先重新构建并运行 `npm run prepare:vercel`，让同一次发布提交中包含新的 `web-dist`。

## Vercel 首次导入时的配置

只有首次连接 GitHub 仓库时需要设置：

- Framework Preset：`Other`
- Root Directory：`./`
- Build Command：留空
- Install Command：留空
- Output Directory：`web-dist`
- Production Branch：`main`
- Environment Variables：当前项目不需要

仓库中的 `vercel.json` 已保存关键配置。不要改成 `npm run build`，因为普通的 Vercel 构建环境中没有 Cocos Creator 编辑器。

## 常见问题

### Vercel 显示 Skipped

通常是本次提交没有包含 `web-dist` 或 `vercel.json` 变化。回到“日常发布”的第 2～6 步重新操作。

### `prepare:vercel` 提示找不到构建

先在 Creator 中完成一次 Web Desktop 构建，并确认任务显示 `build success`。脚本只接受根目录中包含 `index.html` 的有效构建。

### `prepare:vercel` 提示启动场景不正确

在 Creator 的构建任务中把启动场景设为 `Title.scene`，重新构建后再执行脚本。

### Vercel 部署成功，但网页是旧版本

依次检查：

1. `prepare:vercel` 输出的“来源”是否为最新构建；
2. 最新提交是否真的包含 `web-dist` 变化；
3. Vercel 展示的提交号是否与 GitHub 最新提交一致；
4. 使用强制刷新或无痕窗口重新打开。

### GitHub 推送一直没有响应

先检查当前网络是否能访问 GitHub。如果电脑使用 ClashX 等本地代理，终端也需要能够走该代理；这属于 Git 网络问题，与 Creator 构建和 Vercel 配置无关。
