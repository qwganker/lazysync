#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$SCRIPT_DIR"
PROJECT_DIR="$REPO_ROOT/src"
CACHE_DIR="$PROJECT_DIR/.bootstrap-cache"
PID_FILE="$CACHE_DIR/src-dev.pid"
ELECTRON_REBUILD_STAMP="$CACHE_DIR/electron-rebuild.stamp"

mkdir -p "$CACHE_DIR"

log() {
  printf '[run_dev.sh] %s\n' "$1"
}

fail() {
  printf '[run_dev.sh] %s\n' "$1" >&2
  exit 1
}

cleanup_pid_file() {
  if [[ -f "$PID_FILE" ]] && [[ "$(cat "$PID_FILE" 2>/dev/null || true)" == "$$" ]]; then
    rm -f "$PID_FILE"
  fi
}

ensure_project_dir() {
  if [[ ! -f "$PROJECT_DIR/package.json" ]]; then
    fail "未找到 $PROJECT_DIR/package.json，请从仓库根目录执行此脚本。"
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

is_running_pid() {
  local pid="$1"

  if [[ -z "$pid" ]] || ! [[ "$pid" =~ ^[0-9]+$ ]]; then
    return 1
  fi

  ps -p "$pid" >/dev/null 2>&1
}

stop_running_stack() {
  local pid="$1"

  log "检测到 src 开发环境正在运行，正在停止..."
  kill -TERM -- "-$pid" 2>/dev/null || kill -TERM "$pid" 2>/dev/null || true
  rm -f "$PID_FILE"
}

toggle_if_running() {
  if [[ ! -f "$PID_FILE" ]]; then
    return 1
  fi

  local pid=""
  pid="$(cat "$PID_FILE" 2>/dev/null || true)"

  if is_running_pid "$pid"; then
    stop_running_stack "$pid"
    exit 0
  fi

  rm -f "$PID_FILE"
  return 1
}

main() {
  ensure_project_dir
  toggle_if_running || true
  ensure_npm
  ensure_node_dependencies
  ensure_electron_native_modules

  unset ELECTRON_RUN_AS_NODE

  printf '%s' "$$" >"$PID_FILE"
  trap cleanup_pid_file EXIT INT TERM

  log "正在启动 src 新架构开发环境..."
  (cd "$PROJECT_DIR" && npm run dev:src)
}

main "$@"
