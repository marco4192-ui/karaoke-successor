#!/usr/bin/env python3
"""
Systematically compare files from Aug 19-20 commits against current HEAD
to find any changes lost during the accidental pull --rebase.

Already handled files (skip):
  - use-global-remote-control.ts (restored)
  - mirror-views/ (3 files, restored)
  - mobile-songs-view.tsx (restored + enhanced)
  - jukebox-setup-view.tsx (was OK)
  - desktop-chat-panel.tsx (user chose version B)
"""

import subprocess
import sys

BASE = '/home/z/my-project'

# Commits from Aug 19-20 that had real changes (not restore commits, not already handled)
COMMITS = [
    # Aug 19 commits (before/during the session that went wrong)
    ('c5ed52f8', 'feat: wire desktop chat panel + notification, duel/duet chat challenges, chat i18n (Group 2)'),
    ('b130be9b', '649c6aa8 (auto-commit)'),
    ('30d184e3', '6c117b72 (auto-commit)'),
    ('4f9d5cef', 'ff44c5ee (corrupted commit)'),
    # Aug 20 commits (build fixes etc.)
    ('c4af27dd', 'fix: resolve Next.js build errors in mobile-chat and mobile-songs-view'),
    ('ba863cc1', 'fix: narrow clientId type to string with null guard'),
    ('00a6404a', 'fix: correct ternary chain parenthesis, remove leftover .bak file'),
    # Aug 20 UUID commits (parallel sessions)
    ('e3e1950c', 'f7046fcf (auto-commit)'),
    ('c8151b8f', '51f57a32 (auto-commit)'),
    ('abed5484', '87866673 (pre-squash HEAD - restored)'),
]

# Files already handled - skip these
HANDLED_FILES = {
    'src/hooks/use-global-remote-control.ts',
    'src/components/screens/mobile/mirror-views/mirror-library-lite.tsx',
    'src/components/screens/mobile/mirror-views/mirror-party-setup-lite.tsx',
    'src/components/screens/mobile/mirror-views/mirror-settings-lite.tsx',
    'src/components/screens/mobile/mobile-songs-view.tsx',
    'src/components/screens/jukebox/jukebox-setup-view.tsx',
    'src/components/ui/desktop-chat-panel.tsx',
}

# Also skip leaderboard files (untouched by pull-rebase, added Aug 20)
LEADERBOARD_PATTERNS = ['leaderboard', 'highscore', 'fingerprint', 'song-fingerprint']

def git(cmd):
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True, cwd=BASE)
    return result.stdout.strip()

def get_changed_files(commit):
    """Get list of files changed in a commit (relative to parent)."""
    output = git(f'git diff-tree --no-commit-id -r --name-only {commit}')
    return [f for f in output.split('\n') if f] if output else []

def file_exists_at_commit(commit, filepath):
    """Check if file exists at a given commit."""
    result = subprocess.run(
        f'git cat-file -e {commit}:{filepath}',
        shell=True, capture_output=True, cwd=BASE
    )
    return result.returncode == 0

def compare_file(commit, filepath):
    """Compare file at commit vs current HEAD. Returns diff stats or None if same."""
    if not file_exists_at_commit(commit, filepath):
        return None
    
    # Check if file exists at HEAD
    result = subprocess.run(
        f'git cat-file -e HEAD:{filepath}',
        shell=True, capture_output=True, cwd=BASE
    )
    if result.returncode != 0:
        return 'FILE_DELETED_AT_HEAD'
    
    # Get diff between commit version and HEAD version
    output = git(f'git diff {commit}:{filepath} HEAD:{filepath}')
    if not output:
        return None  # identical
    
    lines_added = output.count('\n+') - output.count('\n++')
    lines_removed = output.count('\n-') - output.count('\n--')
    
    return {
        'added': lines_added,
        'removed': lines_removed,
        'total_changes': lines_added + lines_removed,
    }

def get_file_lines(commit, filepath):
    """Get line count of file at commit."""
    output = git(f'git show {commit}:{filepath} | wc -l')
    try:
        return int(output)
    except ValueError:
        return -1

def get_current_lines(filepath):
    """Get line count of file at HEAD."""
    output = git(f'git show HEAD:{filepath} | wc -l')
    try:
        return int(output)
    except ValueError:
        return -1

def is_corrupted(content_sample):
    """Check if file content looks corrupted."""
    return 'mport { useTranslation }/a' in content_sample or 'import { useState } from "react";/' in content_sample

def main():
    print('=' * 80)
    print('ANALYSIS: Checking for lost changes from Aug 19-20 commits')
    print('=' * 80)
    
    all_results = {}  # filepath -> list of (commit, msg, diff_info)
    
    for commit, msg in COMMITS:
        files = get_changed_files(commit)
        if not files:
            continue
            
        for filepath in files:
            # Skip non-source files
            if not any(filepath.startswith(p) for p in ['src/', 'hooks/', 'lib/', 'components/']):
                continue
            
            # Skip handled files
            if filepath in HANDLED_FILES:
                continue
            
            # Skip leaderboard files (added later, not affected by pull-rebase)
            if any(pat in filepath.lower() for pat in LEADERBOARD_PATTERNS):
                continue
            
            # Check if file exists at this commit
            if not file_exists_at_commit(commit, filepath):
                continue
            
            # Check for corruption
            content = git(f'git show {commit}:{filepath} | head -50')
            if is_corrupted(content):
                print(f'  CORRUPTED: {filepath} @ {commit[:8]}')
                continue
            
            # Compare with HEAD
            diff_info = compare_file(commit, filepath)
            
            if diff_info is None:
                # File is identical to HEAD - no loss
                continue
            elif diff_info == 'FILE_DELETED_AT_HEAD':
                if filepath not in all_results:
                    all_results[filepath] = []
                all_results[filepath].append((commit, msg, 'DELETED'))
            elif isinstance(diff_info, dict) and diff_info['total_changes'] > 0:
                if filepath not in all_results:
                    all_results[filepath] = []
                all_results[filepath].append((commit, msg, diff_info))
    
    print()
    if not all_results:
        print('RESULT: No additional lost changes found.')
        print('All files from Aug 19-20 commits are either:')
        print('  - Identical to current HEAD')
        print('  - Already restored in previous sessions')
        print('  - Leaderboard files (untouched)')
        return
    
    print(f'FOUND {len(all_results)} file(s) with differences:')
    print()
    
    for filepath, entries in sorted(all_results.items()):
        print(f'FILE: {filepath}')
        commit_lines = get_current_lines(filepath)
        print(f'  Current HEAD: {commit_lines} lines')
        
        for commit, msg, info in entries:
            if info == 'DELETED':
                print(f'  @ {commit[:8]} ({msg[:60]}): FILE DELETED at HEAD')
            elif isinstance(info, dict):
                ver_lines = get_file_lines(commit, filepath)
                print(f'  @ {commit[:8]} ({msg[:60]}):')
                print(f'    Version at commit: {ver_lines} lines')
                print(f'    Diff vs HEAD: +{info["added"]} -{info["removed"]} lines')
        print()
    
    # Summary classification
    print('=' * 80)
    print('SUMMARY')
    print('=' * 80)
    for filepath, entries in sorted(all_results.items()):
        # Check if the current HEAD version is NEWER (has MORE content)
        # or if the commit version had content that's now missing
        for commit, msg, info in entries:
            if isinstance(info, dict):
                if info['removed'] > info['added'] * 2:
                    print(f'  ⚠️  {filepath}')
                    print(f'      Commit {commit[:8]} had significantly more content (-{info["removed"]} vs +{info["added"]})')
                    print(f'      Possible data loss!')
                elif info['added'] > info['removed'] * 2:
                    print(f'  ✅  {filepath}')
                    print(f'      HEAD is newer than commit {commit[:8]} (+{info["added"]} vs -{info["removed"]})')
                    print(f'      No loss - current version is ahead.')
                else:
                    print(f'  ~   {filepath}')
                    print(f'      Commit {commit[:8]} differs: +{info["added"]} -{info["removed"]}')
                    print(f'      Likely different changes, not necessarily loss.')
            elif info == 'DELETED':
                print(f'  ❌  {filepath} — DELETED at HEAD (existed in commit {commit[:8]})')
        print()

if __name__ == '__main__':
    main()
