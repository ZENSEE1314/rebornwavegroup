#!/bin/bash
# Copies the toolbox to the OneDrive folder so a copy survives if the working folder (in Temp) is lost. One-way: the working copy is the source.
#   bash toolbox/scripts/sync-toolbox.sh
REPO="$(git rev-parse --show-toplevel)"
TARGET="${TOOLBOX_BACKUP:-$HOME/OneDrive/Documents/Reborn-Wave-Toolbox}"
mkdir -p "$TARGET"
rm -rf "$TARGET"/*
cp -r "$REPO/toolbox/." "$TARGET/"
# The notes snapshot is refreshed from the live CLAUDE.md each time.
cp "$REPO/CLAUDE.md" "$TARGET/docs/CLAUDE-notes-snapshot.md"
cp "$REPO/SECURITY.md" "$TARGET/docs/SECURITY.md"
echo "Toolbox copied to $TARGET ($(find "$TARGET" -type f | wc -l) files)"
