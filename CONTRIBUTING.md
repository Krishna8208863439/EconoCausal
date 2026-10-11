# Contributing to EconoCausal

Thank you for contributing to **EconoCausal**! This guide outlines the standard workflow and policies for contributing to this repository.

---

## 1. Branching Strategy

> **CRITICAL RULE:** **Never push directly to `main`.**  
> All changes must be developed on a dedicated feature or fix branch and merged via Pull Request (PR).

### Branch Naming Conventions
Create descriptive branch names using one of the following prefixes:
- `feature/<name>-<short-description>` (e.g., `feature/jay-add-env-example`)
- `fix/<name>-<issue-description>` (e.g., `fix/jay-impute-bug`)
- `docs/<name>-<topic>` (e.g., `docs/jay-update-readme`)

### Creating a Branch
Always branch off the latest `main`:

```powershell
# 1. Switch to main and sync with remote
git checkout main
git pull origin main

# 2. Create and switch to your new branch
git checkout -b feature/<your-name>-<short-description>
```

---

## 2. Local Development Workflow

### Python Environment
1. Ensure Python 3.10+ (tested up to 3.14) is active:
   ```powershell
   python --version
   ```
2. Create and activate a virtual environment (optional but recommended):
   ```powershell
   python -m venv .venv
   .venv\Scripts\Activate.ps1
   ```
3. Install dependencies:
   ```powershell
   pip install -r requirements.txt
   ```
4. Copy the environment template if needed:
   ```powershell
   Copy-Item .env.example .env
   ```

### Running Tests
Before committing or pushing any code, verify that all unit tests pass:

```powershell
python -m pytest tests/ -v
```

All tests must pass (or cleanly skip optional dependencies) before opening a PR.

---

## 3. Commits and Pushing

1. Keep commits focused and atomic with clear messages following Conventional Commits:
   - `feat: ...` for new features
   - `fix: ...` for bug fixes
   - `test: ...` for unit/integration tests
   - `docs: ...` for documentation improvements
   - `chore: ...` for maintenance or config updates

2. Push **only to your feature branch**:
   ```powershell
   git push -u origin feature/<your-name>-<short-description>
   ```

---

## 4. Pull Requests

1. Open a Pull Request from your feature branch into `main` on GitHub.
2. Provide a brief summary of:
   - What changes were made.
   - Why they were needed.
   - How they were tested (`python -m pytest tests/ -v`).
3. Request review from a teammate or mentor before merging.
