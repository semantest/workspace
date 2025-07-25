# 🔒 SECURITY POLICY: GPG SIGNING REQUIREMENT

## CRITICAL REQUIREMENT - NON-NEGOTIABLE

### Policy Statement:
**ALL commits and tags in the Semantest project MUST be GPG signed.**

### Why This Matters:
- **Authenticity**: Proves commits come from verified contributors
- **Integrity**: Prevents tampering with commit history
- **Trust**: Users can verify the source of code changes
- **Security**: Critical for a web automation framework

### Required Commands:

#### For Commits:
```bash
# ALWAYS use -S flag
git commit -S -m "Your commit message"

# NEVER use
git commit -m "message"  # ❌ UNSIGNED - FORBIDDEN
```

#### For Tags:
```bash
# ALWAYS use -s flag
git tag -s v1.0.2 -m "Tag message"

# NEVER use
git tag v1.0.2  # ❌ UNSIGNED - FORBIDDEN
```

### Enforcement:
1. **Pre-commit hooks** should verify signatures
2. **CI/CD** must reject unsigned commits
3. **GitHub branch protection** requires signed commits
4. **Code reviews** must verify GPG signatures

### If Signing Fails:

**IMMEDIATE ACTION REQUIRED:**
1. STOP - Do not attempt workarounds
2. Create GitHub issue immediately
3. Include full error details
4. Wait for security team response

### Example Issue Template:
```markdown
Title: GPG Signing Error - [Brief Description]

## Error Details
- Command: `git commit -S -m "message"`
- Error: [paste full error]
- Environment: [OS, Git version, GPG version]

## Steps Taken
1. [What you tried]
2. [Results]

## Blocked Work
- [ ] v1.0.2 milestone commit
- [ ] Other critical commits
```

### Zero Tolerance:
- **NO** `--no-gpg-sign` flags
- **NO** unsigned commits "just this once"
- **NO** bypassing security for convenience
- **NO** exceptions, even for documentation

### Remember:
> "Security is not optional. Every unsigned commit is a potential vulnerability."

---

## This policy protects our users and our creative revolution! 🔒🚀