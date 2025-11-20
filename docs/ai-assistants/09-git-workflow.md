# 09 - Git Workflow & bd Issue Tracking

**Part of:** AI Assistant Documentation
**Load when:** Working with git, creating commits, PRs, or tracking issues

## Table of Contents
- [bd (beads) Issue Tracking](#bd-beads-issue-tracking)
- [Git Branch Strategy](#git-branch-strategy)
- [Commit Conventions](#commit-conventions)
- [Pull Request Process](#pull-request-process)
- [Code Review Guidelines](#code-review-guidelines)

## bd (beads) Issue Tracking

**CRITICAL**: This project uses **bd (beads)** for ALL issue tracking. DO NOT use markdown TODOs or other tracking methods.

### Why bd?

- **Dependency-aware**: Track blockers and relationships
- **Git-friendly**: Auto-syncs to `.beads/issues.jsonl`
- **Agent-optimized**: JSON output, ready work detection
- **Prevents duplication**: Single source of truth

### Quick Reference

```bash
# Check ready work (unblocked issues)
bd ready --json

# Create new issue
bd create "Issue title" -t bug|feature|task -p 0-4 --json

# Create linked issue
bd create "Found bug" -p 1 --deps discovered-from:bd-123 --json

# Claim issue
bd update bd-42 --status in_progress --json

# Update priority
bd update bd-42 --priority 1 --json

# Complete issue
bd close bd-42 --reason "Completed" --json
```

### Issue Types

- `bug` - Something broken
- `feature` - New functionality
- `task` - Work item (tests, docs, refactoring)
- `epic` - Large feature with subtasks
- `chore` - Maintenance (dependencies, tooling)

### Priorities

- `0` - Critical (security, data loss, broken builds)
- `1` - High (major features, important bugs)
- `2` - Medium (default, nice-to-have)
- `3` - Low (polish, optimization)
- `4` - Backlog (future ideas)

### Workflow for AI Agents

1. **Check ready work**: `bd ready` shows unblocked issues
2. **Claim task**: `bd update <id> --status in_progress`
3. **Work on it**: Implement, test, document
4. **Discover new work?** Create linked issue:
   ```bash
   bd create "Found issue" -p 1 --deps discovered-from:<parent-id>
   ```
5. **Complete**: `bd close <id> --reason "Done"`
6. **Commit together**: Always commit `.beads/issues.jsonl` with code changes

### Auto-Sync

bd automatically syncs with git:
- Exports to `.beads/issues.jsonl` after changes (5s debounce)
- Imports from JSONL when newer (e.g., after `git pull`)
- No manual export/import needed!

### MCP Server (Optional)

If using Claude with MCP:

```bash
pip install beads-mcp
```

Add to `~/.config/claude/config.json`:
```json
{
  "beads": {
    "command": "beads-mcp",
    "args": []
  }
}
```

Use `mcp__beads__*` functions instead of CLI.

### Important Rules

- ✅ Use bd for ALL task tracking
- ✅ Always use `--json` flag for programmatic use
- ✅ Link discovered work with `discovered-from` dependencies
- ✅ Check `bd ready` before asking "what should I work on?"
- ❌ Do NOT create markdown TODO lists
- ❌ Do NOT use external issue trackers
- ❌ Do NOT duplicate tracking systems

## Git Branch Strategy

### Branch Naming

```bash
# Feature branches
claude/feature-name-<session-id>
claude/ai-assistant-docs-01QaEyvXmCwjEcsp9uAwaNQp

# Bug fix branches
claude/fix-bug-description-<session-id>

# Chore branches
claude/chore-update-dependencies-<session-id>
```

**IMPORTANT**: Branch names must:
- Start with `claude/`
- End with session ID
- Otherwise push will fail with 403

### Working with Branches

```bash
# Create and switch to new branch
git checkout -b claude/new-feature-<session-id>

# Push to remote (first time)
git push -u origin claude/new-feature-<session-id>

# Subsequent pushes
git push

# Fetch specific branch
git fetch origin claude/some-branch-<session-id>

# Switch to existing branch
git checkout claude/some-branch-<session-id>
```

### Main Branch

- **Protected**: Cannot push directly
- **All changes via PR**: Must go through pull request
- **CI/CD triggers**: Automatic deployment on merge

## Commit Conventions

### Commit Message Format

```
<type>: <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Add or update tests
- `chore`: Maintenance (dependencies, config)
- `perf`: Performance improvement

### Examples

#### Simple Commit

```bash
git commit -m "feat: Add playoff bracket page

Created new React page for viewing playoff brackets with
real-time updates from API v2 endpoint."
```

#### With bd Issue

```bash
git commit -m "fix: Resolve migration conflict in predictions

Fixes bd-123

Rolled back to common ancestor migration and recreated
conflicting migration files."

# Remember to also commit the bd state
git add .beads/issues.jsonl
git commit -m "chore: Update bd issue state"
```

#### Breaking Change

```bash
git commit -m "feat!: Update API v2 schema for questions

BREAKING CHANGE: QuestionSchema now requires season_slug
instead of season_id. Update all API clients.

Closes bd-456"
```

### Git Commit Best Practices

```bash
# Stage specific files
git add backend/predictions/models/question.py
git add backend/predictions/migrations/0044_new_migration.py

# Stage all changes
git add .

# Commit with message
git commit -m "$(cat <<'EOF'
feat: Add BestRecordQuestion model

Added new polymorphic question type for predicting
team with best record. Includes admin interface and
API schema updates.

Closes bd-789
EOF
)"

# Amend last commit (only if not pushed!)
git commit --amend

# Interactive staging
git add -p
```

## Pull Request Process

### Creating a Pull Request

**Via CLI:**

```bash
# 1. Ensure you're on the correct branch
git branch --show-current

# 2. Push latest changes
git push -u origin claude/feature-name-<session-id>

# 3. View git log and diff to understand changes
git log --oneline -10
git diff main...HEAD

# 4. Create PR with gh CLI (if available)
gh pr create --title "Add playoff bracket feature" --body "$(cat <<'EOF'
## Summary
- Added PlayoffBracket model
- Created API v2 endpoint for playoff data
- Built React page for bracket visualization

## Test Plan
- [ ] Verify API endpoint returns correct data
- [ ] Test bracket rendering in UI
- [ ] Ensure mobile responsiveness
- [ ] Check admin interface for playoffs

Closes bd-123
EOF
)"
```

**Manual (GitHub Web):**
1. Push branch to remote
2. Visit GitHub repository
3. Click "Compare & pull request"
4. Fill in title and description
5. Request reviewers
6. Submit

### PR Description Template

```markdown
## Summary
Brief description of changes (1-3 bullet points)

## Changes Made
- Detailed list of changes
- Include affected files/components
- Note any breaking changes

## Test Plan
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] Checked in multiple browsers (if frontend)

## Screenshots (if applicable)
[Add screenshots of UI changes]

## Related Issues
Closes bd-123
Related to bd-456

## Checklist
- [ ] Code follows project style guidelines
- [ ] Documentation updated
- [ ] Tests added/updated
- [ ] No console errors or warnings
- [ ] Migrations tested (if applicable)
```

## Code Review Guidelines

### For Code Authors

**Before requesting review:**
- [ ] Run tests locally
- [ ] Check for console errors/warnings
- [ ] Review your own diff
- [ ] Update documentation
- [ ] Add/update tests
- [ ] Run linters
- [ ] Test migrations (if any)

**During review:**
- Respond to all comments
- Ask questions if unclear
- Make requested changes promptly
- Re-request review after changes

### For Reviewers

**What to check:**
- [ ] Code correctness and logic
- [ ] Test coverage
- [ ] Performance implications
- [ ] Security considerations
- [ ] Code style and readability
- [ ] Documentation accuracy
- [ ] Breaking changes noted

**Review checklist:**
- Use "Request changes" for blocking issues
- Use "Comment" for non-blocking suggestions
- Use "Approve" when ready to merge
- Be constructive and respectful
- Ask questions, don't assume

## Common Git Operations

### Sync with Main

```bash
# Fetch latest from main
git fetch origin main

# Rebase your branch
git rebase origin/main

# Or merge (if rebase is problematic)
git merge origin/main

# Push (may need force push after rebase)
git push --force-with-lease
```

### Undo Changes

```bash
# Unstage file
git reset HEAD file.py

# Discard local changes
git checkout -- file.py

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Undo last commit (discard changes)
git reset --hard HEAD~1
```

### Stash Changes

```bash
# Stash current changes
git stash

# List stashes
git stash list

# Apply most recent stash
git stash pop

# Apply specific stash
git stash apply stash@{1}
```

### View History

```bash
# Compact log
git log --oneline -10

# With graph
git log --oneline --graph --all

# Changes in file
git log -p -- path/to/file.py

# Changes by author
git log --author="Claude"
```

## Related Documentation

- **bd details**: See `AGENTS.md`
- **Deployment**: Load `10-deployment.md`
- **Common tasks**: Load `08-common-tasks.md`

---

**Key Takeaways:**
1. **Always use bd** for issue tracking
2. **Branch naming**: Must start with `claude/` and end with session ID
3. **Commit messages**: Use conventional commits format
4. **Always commit** `.beads/issues.jsonl` with code changes
5. **PR descriptions**: Use template, include test plan
6. **Code review**: Be thorough and constructive
