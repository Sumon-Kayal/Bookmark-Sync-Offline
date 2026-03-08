# Changelog

All notable changes to Bookmark Sync Offline are documented here.

---

## [3.0.0] - 2026-03-07 (Current)

### Fixed
- Wrap file import in `try-finally` for proper cleanup (`8ca470c`)
- Improve import bookmarks instructions in README (`9fdf879`)
- Update SETUP.md with icon size documentation (`0cc5101`)

### Removed
- Deleted `COPYING` file (replaced by LICENSE) (`db05e5a`)
- Deleted `CREATE_ICONS.md` (`faa1876`)
- Deleted `DEPLOYMENT_COMPLETE.md` (`511c357`)
- Cleaned up stray `.gitignore` entries (`86e1498`)

---

## [2.1.0] - 2026-03-07

### Changed
- Multiple iterative file updates via PRs #20–#25
- Reverted a bad upload from PR #15 via PR #19 (`b76168e`)

### Fixed
- Removed `icons/Sample.txt` placeholder — added in `5df1a66`, then deleted in `6cdb803`

---

## [2.0.0] - 2026-01-22

### Added
- CodeRabbit auto-generated docstrings pass (`61de498`)
- Initial MV3 extension files uploaded (`37a7e09`)

### Changed
- `popup.js` updated (`35f9b08`)
- `manager.html` updated (`f42c6a3`)
- `styles.css` updated (`9860286`)
- README formatting and content improvements (`695817e`, `15c2307`, `52b071c`, `b367e0d`, `f3f72f3`, `5501f41`)
- `DEPLOYMENT_COMPLETE.md` updated (`f922fbd`)

### Removed
- Deleted original `LICENSE` (later re-added as MIT) (`640d856`)
- Deleted original `.gitignore` (`0843f3e`)

---

## [1.0.0] - 2026-01-16

### Added
- Initial commit — base extension scaffolding (`8fe9581`)
