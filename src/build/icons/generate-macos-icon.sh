#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_ICON="$SCRIPT_DIR/icon-source.png"
OUTPUT_ICON="$SCRIPT_DIR/icon.icns"
TEMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/lazysync.iconset.XXXXXX")"
ICONSET_DIR="$TEMP_DIR/icon.iconset"
TIFF_DIR="$TEMP_DIR/tiff"

ICON_SPECS=(
  "16:icon_16x16"
  "32:icon_16x16@2x"
  "32:icon_32x32"
  "64:icon_32x32@2x"
  "128:icon_128x128"
  "256:icon_128x128@2x"
  "256:icon_256x256"
  "512:icon_256x256@2x"
  "512:icon_512x512"
  "1024:icon_512x512@2x"
)

log() {
  printf '[generate-macos-icon.sh] %s\n' "$1"
}

fail() {
  printf '[generate-macos-icon.sh] %s\n' "$1" >&2
  exit 1
}

cleanup() {
  rm -rf "$TEMP_DIR"
}

trap cleanup EXIT

require_tool() {
  local tool_name="$1"
  if ! command -v "$tool_name" >/dev/null 2>&1; then
    fail "未找到 $tool_name，请在 macOS 环境中执行此脚本。"
  fi
}

resize_icon() {
  local size="$1"
  local format="${2:-png}"
  local output_path="$3"

  sips -z "$size" "$size" "$SOURCE_ICON" --setProperty format "$format" --out "$output_path" >/dev/null
}

generate_iconset() {
  mkdir -p "$ICONSET_DIR"

  for spec in "${ICON_SPECS[@]}"; do
    local size="${spec%%:*}"
    local file_name="${spec#*:}.png"
    resize_icon "$size" "png" "$ICONSET_DIR/$file_name"
  done
}

generate_tiff_icon() {
  local tiff_output="$TEMP_DIR/iconset.tiff"

  mkdir -p "$TIFF_DIR"

  for spec in "${ICON_SPECS[@]}"; do
    local size="${spec%%:*}"
    local file_name="${spec#*:}.tiff"
    resize_icon "$size" "tiff" "$TIFF_DIR/$file_name"
  done

  tiffutil -catnosizecheck "$TIFF_DIR"/*.tiff -out "$tiff_output" >/dev/null 2>&1
  tiff2icns "$tiff_output" "$OUTPUT_ICON" >/dev/null
}

main() {
  require_tool sips
  require_tool iconutil
  require_tool tiffutil
  require_tool tiff2icns

  if [[ ! -f "$SOURCE_ICON" ]]; then
    fail "未找到源图标：$SOURCE_ICON"
  fi

  log "正在生成 iconset..."
  generate_iconset

  log "正在生成 $OUTPUT_ICON ..."
  rm -f "$OUTPUT_ICON"

  if ! iconutil -c icns "$ICONSET_DIR" -o "$OUTPUT_ICON" >/dev/null 2>&1; then
    log "iconutil 生成失败，正在回退到 tiff2icns..."
    generate_tiff_icon
  fi

  log "已完成。"
}

main "$@"
