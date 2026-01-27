# Bug Report: Database Schema Mismatches

**Date**: 2026-01-27
**Severity**: CRITICAL
**Status**: Open
**Reporter**: Claude

---

## Executive Summary

Multiple critical database schema mismatches were discovered between the SQLAlchemy models (Python) and the actual PostgreSQL database schema. These mismatches cause runtime errors and will prevent core functionality from working correctly.

**Impact**: Application cannot load groups, foreign key relationships are broken, and data integrity is compromised.

---

## Symptoms

### User-Facing Error
- Frontend displays: "Failed to load groups"
- Backend API endpoint `/api/groups` returns 500 Internal Server Error

### Technical Error
```
sqlalchemy.exc.ProgrammingError: (psycopg2.errors.UndefinedColumn)
column groups.representative_summary does not exist
```

---

## Root Cause Analysis

### 1. How Tables Are Created
- Tables are created via `Base.metadata.create_all(bind=engine)` in `backend/app/main.py:101`
- **Critical Limitation**: SQLAlchemy's `create_all()` only creates NEW tables - it does NOT alter existing tables
- Migration files in `backend/app/migrations/*.sql` are NOT automatically executed
- Tables were created from outdated migration files or outdated model definitions

### 2. Migration System Issues
- Migration files exist but are not automatically executed
- No migration tracking system (Alembic, etc.) is in place
- Migration files are outdated compared to current model definitions
- This created a "drift" between what the database has and what the code expects

---

## Detailed Schema Mismatches

### Critical Issue #1: posts.group_id Type Mismatch

**Severity**: CRITICAL
**Impact**: Foreign key relationship is broken, will cause runtime errors when joining tables

**Database Schema** (actual):
```sql
group_id | character varying | nullable
```

**Python Model** (expected):
```python
group_id = Column(Integer, index=True)  # FK to Groups.id
```

**Why This Is Critical**:
- The database has `group_id` as VARCHAR (text)
- The model expects `group_id` as INTEGER
- This is supposed to be a foreign key to `groups.id` (which IS an integer)
- Any attempt to join posts → groups will fail
- Type coercion errors will occur during queries
- Cannot establish proper referential integrity

**Location**:
- File: `backend/app/models/post.py:31`
- Table: `posts`
- Column: `group_id`

---

### Critical Issue #2: groups table - Missing Columns

**Severity**: CRITICAL
**Impact**: Application crashes when querying groups table (current error)

**Database Schema** (actual):
```sql
CREATE TABLE groups (
    id SERIAL PRIMARY KEY,
    representative_title VARCHAR NOT NULL,
    category VARCHAR NOT NULL,
    first_seen TIMESTAMP NOT NULL,
    post_count INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    state VARCHAR DEFAULT 'NEW' NOT NULL  -- Added by SQLAlchemy
);
```

**Python Model** (expected):
```python
class Group(Base):
    __tablename__ = "groups"

    # Columns that exist in DB ✓
    id = Column(Integer, primary_key=True, index=True)
    representative_title = Column(String, nullable=False)
    category = Column(String, nullable=False)
    first_seen = Column(DateTime, nullable=False)
    post_count = Column(Integer, default=1, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    state = Column(String, default='NEW', nullable=False, index=True)

    # MISSING COLUMNS - Cause application crashes ✗
    representative_summary = Column(Text, nullable=True)
    archived = Column(Boolean, default=False, nullable=False, index=True)
    selected = Column(Boolean, default=False, nullable=False)
```

**Missing Columns**:
1. `representative_summary` (TEXT, nullable) - For AI-generated summary
2. `archived` (BOOLEAN, NOT NULL, indexed, default=False) - User archived flag
3. `selected` (BOOLEAN, NOT NULL, default=False) - User selected for article flag

**Why This Is Critical**:
- SQLAlchemy tries to SELECT these columns in every query
- PostgreSQL returns "column does not exist" error
- Breaks all group-related API endpoints
- Frontend cannot load groups page

**Location**:
- File: `backend/app/models/group.py:22-27`
- Table: `groups`
- Outdated migration: `backend/app/migrations/002_create_groups_table.sql`

---

### Issue #3: posts table - Orphaned Columns

**Severity**: MEDIUM
**Impact**: Confusing, wasted space, but not causing errors currently

**Database Schema** (actual):
```sql
CREATE TABLE posts (
    -- ... other columns ...
    content_hash VARCHAR,           -- ORPHANED
    archived BOOLEAN,               -- ORPHANED
    selected BOOLEAN,               -- ORPHANED
    -- ...
);
```

**Python Model**:
```python
class Post(Base):
    # ... other columns ...
    # content_hash - NOT DEFINED
    # archived - NOT DEFINED
    # selected - NOT DEFINED
```

**Why This Is A Problem**:
- These columns exist in the database but are not defined in the model
- SQLAlchemy will ignore them (won't select or update them)
- Wastes database storage
- Creates confusion: "Why are these columns here?"
- Suggests code was removed but database wasn't cleaned up
- Could cause issues if code tries to use them later

**Likely Explanation**:
- These fields were moved from `posts` table to `groups` table
- Python model was updated but database schema was not migrated
- "Duplicate detection" moved from post-level to group-level
- "Selection" moved from post-level to group-level

---

## Dependency Chain Analysis

### Foreign Key Relationships
```
groups (id)
    ↑
    ├─ posts.group_id → groups.id (BROKEN: VARCHAR instead of INTEGER)
    ├─ group_research.group_id → groups.id (OK)
    └─ group_articles.group_id → groups.id (OK)

group_research (id)
    ↑
    └─ group_articles.research_id → group_research.id (OK)
```

### Tables That Depend on `groups` Table:
1. `posts` - Has `group_id` column (but wrong type!)
2. `group_research` - Has `group_id` foreign key
3. `group_articles` - Has `group_id` foreign key

**Current Data Status** (all tables are EMPTY):
```
posts:           0 rows
groups:          0 rows
group_research:  0 rows
group_articles:  0 rows
```

---

## Impact Assessment

### What's Currently Broken:
1. ✗ Frontend cannot load groups page
2. ✗ API endpoint `/api/groups` returns 500 error
3. ✗ Cannot create new groups (missing columns)
4. ✗ Cannot query groups (missing columns)
5. ✗ Foreign key from posts → groups is broken (type mismatch)

### What Will Break In The Future:
1. ✗ Joining posts → groups will fail (type mismatch on group_id)
2. ✗ Any code that tries to set post.archived or post.selected will fail silently
3. ✗ Any code that checks post.content_hash will get None (field not mapped)
4. ✗ Duplicate detection may not work as expected
5. ✗ Data integrity is compromised (no proper foreign key constraints)

### What Still Works:
1. ✓ Other tables (articles, prompts, list_metadata, system_settings)
2. ✓ Application startup
3. ✓ API endpoints not related to groups

---

## Recommended Fix

### Strategy: Clean Slate Approach

**Why Safe**:
- All affected tables are EMPTY (0 rows)
- No data will be lost
- Ensures perfect alignment between models and database
- Eliminates all drift

**Steps**:
1. Drop tables in correct order (respecting foreign key dependencies):
   ```sql
   DROP TABLE IF EXISTS group_articles CASCADE;
   DROP TABLE IF EXISTS group_research CASCADE;
   DROP TABLE IF EXISTS posts CASCADE;
   DROP TABLE IF EXISTS groups CASCADE;
   ```

2. Let SQLAlchemy recreate tables from current models:
   - Restart backend service
   - `Base.metadata.create_all()` will recreate tables
   - Schema will perfectly match Python models

3. Verify schema matches models:
   ```sql
   \d groups
   \d posts
   \d group_research
   \d group_articles
   ```

### Alternative: Manual Migration (NOT RECOMMENDED)

If we wanted to preserve data (but we have none), we'd need:

```sql
-- Fix posts.group_id type
ALTER TABLE posts DROP COLUMN group_id;
ALTER TABLE posts ADD COLUMN group_id INTEGER;
CREATE INDEX ix_posts_group_id ON posts(group_id);

-- Drop orphaned columns in posts
ALTER TABLE posts DROP COLUMN content_hash;
ALTER TABLE posts DROP COLUMN archived;
ALTER TABLE posts DROP COLUMN selected;

-- Add missing columns to groups
ALTER TABLE groups ADD COLUMN representative_summary TEXT;
ALTER TABLE groups ADD COLUMN archived BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE groups ADD COLUMN selected BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX ix_groups_archived ON groups(archived);
```

But since tables are empty, clean slate is safer and faster.

---

## Files Requiring Attention

### Migration Files (Outdated):
- `backend/app/migrations/002_create_groups_table.sql` - Missing 3 columns
- No migration for posts.group_id type change

### Model Files (Correct):
- `backend/app/models/group.py` - Defines expected schema
- `backend/app/models/post.py` - Defines expected schema
- `backend/app/models/group_research.py` - OK
- `backend/app/models/group_articles.py` - OK

### System Files:
- `backend/app/main.py:101` - Uses `Base.metadata.create_all()` (limitation)
- `backend/app/database.py` - Database initialization

---

## Prevention Recommendations

### Immediate:
1. Implement proper migration system (Alembic)
2. Update outdated migration files to match current models
3. Add schema validation tests to CI/CD

### Long-term:
1. Never rely on `create_all()` for schema changes
2. All schema changes must go through migration files
3. Add database schema tests that compare model → actual schema
4. Document the migration system clearly

---

## Testing Checklist

After fix is applied:

- [ ] Verify groups table has all expected columns
- [ ] Verify posts.group_id is INTEGER type
- [ ] Verify foreign key constraints are in place
- [ ] Test `/api/groups` endpoint returns 200
- [ ] Test frontend loads groups page without errors
- [ ] Verify orphaned columns are removed from posts
- [ ] Run schema comparison script (model vs database)
- [ ] Test creating a new group
- [ ] Test creating a post with group_id reference
- [ ] Test joining posts → groups in a query

---

## Additional Notes

### System Environment:
- PostgreSQL: 15-alpine
- SQLAlchemy: 2.0.25
- Python: 3.11-slim
- Database: klaus_news
- Database User: postgres

### Related Documentation:
- `docs/TECH_OVERVIEW.md` - System architecture
- `docs/GOTCHAS.md` - Known issues
- `.env.example` - Configuration template

### Timeline:
- **Discovered**: 2026-01-27 14:00 CET
- **Last Updated**: 2026-01-27 14:30 CET
- **Fixed**: [Pending]

---

## Appendix: Complete Schema Comparison

### Groups Table

| Column | Database Type | Database Exists | Model Type | Model Expects | Status |
|--------|--------------|----------------|-----------|--------------|---------|
| id | INTEGER | ✓ | Integer | ✓ | ✓ OK |
| representative_title | VARCHAR | ✓ | String | ✓ | ✓ OK |
| category | VARCHAR | ✓ | String | ✓ | ✓ OK |
| first_seen | TIMESTAMP | ✓ | DateTime | ✓ | ✓ OK |
| post_count | INTEGER | ✓ | Integer | ✓ | ✓ OK |
| created_at | TIMESTAMP | ✓ | DateTime | ✓ | ✓ OK |
| updated_at | TIMESTAMP | ✓ | DateTime | ✓ | ✓ OK |
| state | VARCHAR | ✓ | String | ✓ | ✓ OK |
| representative_summary | - | ✗ | Text | ✓ | ✗ MISSING |
| archived | - | ✗ | Boolean | ✓ | ✗ MISSING |
| selected | - | ✗ | Boolean | ✓ | ✗ MISSING |

### Posts Table

| Column | Database Type | Database Exists | Model Type | Model Expects | Status |
|--------|--------------|----------------|-----------|--------------|---------|
| id | INTEGER | ✓ | Integer | ✓ | ✓ OK |
| post_id | VARCHAR | ✓ | String | ✓ | ✓ OK |
| original_text | TEXT | ✓ | Text | ✓ | ✓ OK |
| author | VARCHAR | ✓ | String | ✓ | ✓ OK |
| created_at | TIMESTAMP | ✓ | DateTime | ✓ | ✓ OK |
| ai_title | VARCHAR | ✓ | String | ✓ | ✓ OK |
| ai_summary | TEXT | ✓ | Text | ✓ | ✓ OK |
| category | VARCHAR | ✓ | String | ✓ | ✓ OK |
| categorization_score | DOUBLE PRECISION | ✓ | Float | ✓ | ✓ OK |
| worthiness_score | DOUBLE PRECISION | ✓ | Float | ✓ | ✓ OK |
| **group_id** | **VARCHAR** | ✓ | **Integer** | ✓ | **✗ TYPE MISMATCH** |
| ingested_at | TIMESTAMP | ✓ | DateTime | ✓ | ✓ OK |
| updated_at | TIMESTAMP | ✓ | DateTime | ✓ | ✓ OK |
| content_hash | VARCHAR | ✓ | - | ✗ | ⚠ ORPHANED |
| archived | BOOLEAN | ✓ | - | ✗ | ⚠ ORPHANED |
| selected | BOOLEAN | ✓ | - | ✗ | ⚠ ORPHANED |

---

**End of Bug Report**
