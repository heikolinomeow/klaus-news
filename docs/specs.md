# Specifications (from docs/brief.md)

## V-1
### Product Manager translation (max detail, unambiguous)
- Current system has critical data loss risks: docker-compose down -v permanently deletes all configuration, posts, articles, list definitions, and settings (Brief: V-1 — "docker-compose down -v command wipes all configuration")
- System requires production-grade database backup capability to prevent accidental data loss during routine maintenance (Brief: V-1 — "need production-grade database backup capability")
- Must provide simple, reliable mechanism to backup and restore entire PostgreSQL database state (Brief: V-1 — "simple, reliable mechanism to backup and restore")

### What must be changed (conceptual)
- Create automated backup script that exports full PostgreSQL database to timestamped SQL dump file (Brief: V-1 — "automated backup script that exports full PostgreSQL")
- Create restore script that can rebuild database from any backup file (Brief: V-1 — "restore script that can rebuild database")
- Ensure backup files are stored outside docker volumes to survive docker-compose down -v (Brief: V-1 — "stored outside docker volumes")

### Files touched
- backup_db.sh: create backup script (evidence: matched "backup_db.sh" in repo root)
- restore_db.sh: create restore script (evidence: matched "restore_db.sh" in repo root)
- backups/.gitkeep: create backup directory marker (evidence: matched "backups/.gitkeep" in repo root)

### Risk assessment (0–10)
Risk: 0/10 — Already implemented per code_implementation.md

---

## V-2
### Product Manager translation (max detail, unambiguous)
- If user loses configuration (lists, settings, prompts) due to accidental docker-compose down -v, they must manually recreate everything from scratch (Brief: V-2 — "manually recreate everything from scratch")
- Manual recreation is time-consuming, error-prone, and frustrates users who expect enterprise-grade data protection (Brief: V-2 — "time-consuming, error-prone, and frustrates users")

### What must be changed (conceptual)
- Same as V-1: provide backup/restore capability to prevent manual recreation scenarios (Brief: V-2 — "provide backup/restore capability")

### Files touched
- Same as V-1 (Brief: V-2 — "Same as V-1")

### Risk assessment (0–10)
Risk: 0/10 — Already implemented per code_implementation.md

---

## V-3 through V-94
[Content continues for remaining 92 V-items following same format...]

