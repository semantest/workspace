# 🔐 MANDATORY GPG SIGNING POLICY

## CRITICAL REQUIREMENTS - NO EXCEPTIONS

### 1. Configure GPG Signing
```bash
# Set up GPG key
git config --global user.signingkey YOUR_GPG_KEY_ID
git config --global commit.gpgsign true
git config --global tag.gpgsign true
```

### 2. ALWAYS Sign Commits
```bash
# ✅ CORRECT - Signed commit
git commit -S -m "feat: implement image download handler"

# ❌ WRONG - Unsigned commit (REJECTED)
git commit -m "feat: implement image download handler"
```

### 3. ALWAYS Sign Tags
```bash
# ✅ CORRECT - Signed tag
git tag -s v1.0.3 -m "Release: Image download feature"

# ❌ WRONG - Unsigned tag (REJECTED)
git tag v1.0.3 -m "Release: Image download feature"
```

### 4. Update GitHub Issues
- Reference issue numbers in commits: `fixes #123`
- Update issue status after implementation
- Add progress comments with signed commit SHAs

### 5. Verification
```bash
# Verify commit signature
git log --show-signature -1

# Verify tag signature
git tag -v v1.0.3
```

## Team Compliance Checklist
- [ ] Backend team: GPG configured
- [ ] Extension team: GPG configured
- [ ] QA team: GPG configured
- [ ] All commits signed with -S
- [ ] All tags signed with -s
- [ ] GitHub issues updated

## Consequences of Non-Compliance
- Unsigned commits will be REJECTED
- PRs with unsigned commits will be BLOCKED
- Tags without signatures will be DELETED

**Remember**: After 597 workflow checks, we finally have progress. Don't let unsigned commits be the new blocker!

---
Generated: 2025-07-25 | Check #597