import { cp, readdir, readFile, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '..');
const buildRoot = path.join(projectRoot, 'build');
const outputDirectory = path.join(projectRoot, 'web-dist');
const expectedLaunchScene = 'db://assets/scenes/Title.scene';

async function findLatestBuild() {
  const candidates = [];

  async function collectCandidates(directory, remainingDepth) {
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch {
      return;
    }

    const indexPath = path.join(directory, 'index.html');
    try {
      const indexStat = await stat(indexPath);
      candidates.push({ directory, modifiedAt: indexStat.mtimeMs });
    } catch {
      // A Cocos build folder is only deployable when index.html exists at its root.
    }

    if (remainingDepth === 0) return;
    for (const entry of entries) {
      if (entry.isDirectory()) {
        await collectCandidates(path.join(directory, entry.name), remainingDepth - 1);
      }
    }
  }

  try {
    await stat(buildRoot);
  } catch {
    throw new Error('没有找到 build，请先在 Cocos Creator 中完成 Web Desktop 构建。');
  }

  // Creator may output either build/<task-name> or build/web-desktop/<task-name>.
  await collectCandidates(buildRoot, 2);

  if (candidates.length === 0) {
    throw new Error('build 下没有包含 index.html 的可部署构建。');
  }

  candidates.sort((left, right) => right.modifiedAt - left.modifiedAt);
  return candidates[0].directory;
}

async function validateBuild(buildDirectory) {
  const requiredFiles = [
    'index.html',
    'index.js',
    'application.js',
    path.join('src', 'settings.json'),
  ];

  for (const relativePath of requiredFiles) {
    try {
      await stat(path.join(buildDirectory, relativePath));
    } catch {
      throw new Error(`构建缺少必要文件：${relativePath}`);
    }
  }

  const settingsPath = path.join(buildDirectory, 'src', 'settings.json');
  const settings = JSON.parse(await readFile(settingsPath, 'utf8'));
  if (settings.launch?.launchScene !== expectedLaunchScene) {
    throw new Error(
      `启动场景应为 ${expectedLaunchScene}，当前为 ${settings.launch?.launchScene ?? '未设置'}。`,
    );
  }
}

async function countFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  let count = 0;
  for (const entry of entries) {
    if (entry.isDirectory()) {
      count += await countFiles(path.join(directory, entry.name));
    } else {
      count += 1;
    }
  }
  return count;
}

const latestBuild = await findLatestBuild();
await validateBuild(latestBuild);

await rm(outputDirectory, { recursive: true, force: true });
await cp(latestBuild, outputDirectory, {
  recursive: true,
  filter: (source) => path.basename(source) !== '.DS_Store',
});

const fileCount = await countFiles(outputDirectory);
console.log(`Vercel 发布目录已更新：${path.relative(projectRoot, outputDirectory)}`);
console.log(`来源：${path.relative(projectRoot, latestBuild)}`);
console.log(`启动场景：${expectedLaunchScene}`);
console.log(`文件数量：${fileCount}`);
