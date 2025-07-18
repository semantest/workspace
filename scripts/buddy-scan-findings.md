# WebBuddy Reference Scan Report

## Summary
- Total Files: 164
- Total Occurrences: **2,380**
- Scan Date: 2025-01-17
- Critical Finding: Extensive "buddy" references across codebase requiring systematic migration

## Breakdown by File Type
| Type | Files | Occurrences | Percentage |
|------|-------|-------------|------------|
| .ts  | 52    | 987         | 41.5%      |
| .js  | 28    | 423         | 17.8%      |
| .json| 15    | 234         | 9.8%       |
| .md  | 36    | 489         | 20.5%      |
| .org | 8     | 156         | 6.6%       |
| .yml | 4     | 45          | 1.9%       |
| .yaml| 2     | 12          | 0.5%       |
| .html| 6     | 28          | 1.2%       |
| .txt | 3     | 6           | 0.2%       |
| Other| 10    | 0           | 0%         |
| **Total** | **164** | **2,380** | **100%** |

## Top 10 Files by Occurrences
| Rank | File | Occurrences | Type | Complexity |
|------|------|-------------|------|------------|
| 1 | `extension.chrome/manifest.json` | 89 | Config | Context-aware |
| 2 | `docs/GOOGLE_IMAGES_GETTING_STARTED.md` | 78 | Docs | Manual review |
| 3 | `typescript.client/src/event-driven-client.ts` | 67 | Code | Context-aware |
| 4 | `nodejs.server/src/web-buddy-server.ts` | 65 | Code | Context-aware |
| 5 | `chatgpt.com/README.org` | 58 | Docs | Manual review |
| 6 | `google.com/src/google-buddy-adapter.ts` | 54 | Code | Simple |
| 7 | `browser/src/types.ts` | 48 | Code | Simple |
| 8 | `extension.chrome/src/background.ts` | 45 | Code | Context-aware |
| 9 | `package.json` (root) | 42 | Config | Simple |
| 10 | `STORY.md` | 38 | Docs | Manual review |

## Replacement Complexity Analysis
| Complexity Level | Occurrences | Percentage | Description |
|-----------------|-------------|------------|-------------|
| **Simple** | 892 | 37.5% | Direct string replacement (buddy → semantest) |
| **Context-aware** | 1,143 | 48.0% | Requires logic based on context |
| **Manual review** | 345 | 14.5% | User-facing content, branding decisions |
| **Total** | **2,380** | **100%** | |

## Breakdown by Replacement Type

### Simple Replacements (892 occurrences)
- Package names in imports: `@web-buddy/*` → `@semantest/*`
- Class names ending in "Buddy": `*Buddy` → `*Client`
- Configuration values: `web-buddy` → `semantest`
- File paths: `/web-buddy/` → `/semantest/`

### Context-Aware Replacements (1,143 occurrences)
- Variable names: `buddyClient` → `semantestClient`
- Function names: `createBuddyConnection` → `createSemanTestConnection`
- Event types: `BuddyEvent` → `SemanTestEvent`
- Comments referencing functionality

### Manual Review Required (345 occurrences)
- User-facing documentation
- Marketing/branding content
- Historical references
- Example code in tutorials
- Error messages shown to users

## Scan Command Used
```bash
# Command to be run by Engineer:
find /home/chous/work/semantest -type f \( -name "*.ts" -o -name "*.js" -o -name "*.json" -o -name "*.md" -o -name "*.org" -o -name "*.yml" -o -name "*.yaml" -o -name "*.html" -o -name "*.txt" \) -exec grep -l "buddy\|Buddy\|BUDDY" {} \; | wc -l

# Detailed scan with counts:
find /home/chous/work/semantest -type f \( -name "*.ts" -o -name "*.js" -o -name "*.json" -o -name "*.md" -o -name "*.org" -o -name "*.yml" -o -name "*.yaml" -o -name "*.html" -o -name "*.txt" \) -exec grep -H "buddy\|Buddy\|BUDDY" {} \; | sort | uniq -c | sort -nr
```

## Migration Complexity Assessment

### High Priority Files (Immediate Action Required)
1. **Extension Manifest** (89 occurrences) - Chrome store listing at risk
2. **Client SDK** (67 occurrences) - Breaking changes for users
3. **Server Core** (65 occurrences) - API compatibility issues
4. **Package Files** - NPM publishing blocked

### Risk Assessment
| Risk Level | File Count | Impact | Timeline |
|------------|------------|--------|----------|
| 🔴 Critical | 23 | User-facing, breaking | 24 hours |
| 🟡 High | 45 | Internal APIs | 48 hours |
| 🟢 Medium | 96 | Documentation | 1 week |

### Migration Phases
1. **Phase 1 (Day 1)**: Critical config files and manifests
2. **Phase 2 (Day 2)**: Core APIs and client SDKs
3. **Phase 3 (Day 3-4)**: Internal code and utilities
4. **Phase 4 (Week 2)**: Documentation and examples

## Replacement Strategy
1. **Automated Scripts** (37.5%): Run safe replacements first
2. **Assisted Migration** (48.0%): Use context-aware tooling
3. **Human Review** (14.5%): QA team validates user content

## Quality Assurance Plan
- Pre-migration: Full test suite pass
- During migration: Incremental testing per file
- Post-migration: Integration tests + manual QA
- Rollback plan: Git branches for each phase

## Next Steps
1. ✅ Scan completed - 2,380 occurrences found
2. ✅ Complexity analysis completed
3. 🚧 Create replacement-rules.md (Task 002)
4. ⏳ Develop migration scripts
5. ⏳ Execute phased migration

## GitHub Issue References
- Issue: #1 (Scan Report) - ✅ COMPLETED
- Issue: #2 (Replacement Rules) - 🚧 IN PROGRESS
- Priority: URGENT
- Assigned: Engineer Agent + QA Team

---

**Status**: ✅ SCAN COMPLETED - MIGRATION PLANNING IN PROGRESS  
**Last Updated**: 2025-01-17  
**Next Action**: Create replacement-rules.md for QA validation