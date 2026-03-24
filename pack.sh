#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$SCRIPT_DIR"
PROJECT_DIR="$REPO_ROOT/src"
CACHE_DIR="$PROJECT_DIR/.bootstrap-cache"
DIST_DIR="$REPO_ROOT/dist"
ELECTRON_REBUILD_STAMP="$CACHE_DIR/electron-rebuild.stamp"
ELECTRON_BUILDER_CONFIG="$PROJECT_DIR/electron-builder.yml"

mkdir -p "$CACHE_DIR"

log() {
  printf '[pack.sh] %s\n' "$1"
}

fail() {
  printf '[pack.sh] %s\n' "$1" >&2
  exit 1
}

ensure_project_dir() {
  if [[ ! -f "$PROJECT_DIR/package.json" ]]; then
    fail "未找到 $PROJECT_DIR/package.json，请从仓库根目录执行此脚本。"
  fi

  if [[ ! -f "$ELECTRON_BUILDER_CONFIG" ]]; then
    fail "未找到 $ELECTRON_BUILDER_CONFIG。"
  fi
}

ensure_npm() {
  if ! command -v npm >/dev/null 2>&1; then
    fail "未找到 npm，请先安装 Node.js 20+。"
  fi
}

ensure_node_dependencies() {
  if [[ ! -d "$PROJECT_DIR/node_modules" ]]; then
    log "正在安装 Node 依赖..."
    (cd "$PROJECT_DIR" && npm install)
    rm -f "$ELECTRON_REBUILD_STAMP"
    return
  fi

  log "Node 依赖已就绪。"
}

ensure_electron_native_modules() {
  local lock_hash=""
  lock_hash="$(shasum -a 256 "$PROJECT_DIR/package-lock.json" | awk '{print $1}')"

  if [[ -f "$ELECTRON_REBUILD_STAMP" ]] && [[ "$(cat "$ELECTRON_REBUILD_STAMP" 2>/dev/null || true)" == "$lock_hash" ]]; then
    log "Electron 原生模块已就绪。"
    return
  fi

  log "正在为 Electron 重建 better-sqlite3..."
  (cd "$PROJECT_DIR" && npx @electron/rebuild --force --only better-sqlite3)
  printf '%s' "$lock_hash" >"$ELECTRON_REBUILD_STAMP"
}

clear_previous_artifacts() {
  if [[ -d "$DIST_DIR" ]]; then
    log "正在清理旧的打包产物..."
    rm -rf "$DIST_DIR"
  fi
}

build_project() {
  log "正在构建桌面应用..."
  (cd "$PROJECT_DIR" && npm run build)
}

package_desktop_app() {
  log "正在输出 macOS .app 目录包与 .dmg 安装包到 $DIST_DIR ..."
  (
    cd "$PROJECT_DIR" &&
      npx electron-builder --projectDir "$PROJECT_DIR" --config "$ELECTRON_BUILDER_CONFIG" --mac dir dmg
  )
}

main() {
  ensure_project_dir
  ensure_npm
  ensure_node_dependencies
  ensure_electron_native_modules
  clear_previous_artifacts

  unset ELECTRON_RUN_AS_NODE

  build_project
  package_desktop_app
}

main "$@"
