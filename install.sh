#!/usr/bin/env bash
# 可选: 将本扩展安装到 Pi Agent 的扩展目录
set -euo pipefail
PI_EXT="${HOME}/.pi/agent/extensions/chat-with-doc"
PI_SKILLS="${HOME}/.pi/agent/skills"
ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "==> 构建..."
npm run build

echo "==> 安装 extension -> $PI_EXT"
mkdir -p "$PI_EXT"
cp -r "$ROOT/dist" "$ROOT/settings.json" "$PI_EXT/"

for skill in mode-discuss mode-design mode-experiment mode-produce mode-maintain doc-sync; do
  mkdir -p "$PI_SKILLS/$skill"
  cp "$ROOT/skills/$skill/SKILL.md" "$PI_SKILLS/$skill/"
done

echo "==> 完成. 重启 Pi Agent 以加载 chat-with-doc."
