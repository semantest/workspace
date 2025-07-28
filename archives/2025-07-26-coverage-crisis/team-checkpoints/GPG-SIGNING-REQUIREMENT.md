# 🔒 GPG SIGNING REQUIREMENT - SEMANTEST PROJECT

**Date**: 2025-07-23  
**Status**: MANDATORY  
**Enforced By**: rydnr

## SECURITY POLICY

All commits and tags MUST be GPG signed. No exceptions.

## Quick Setup

```bash
# Configure GPG signing
git config commit.gpgsign true
git config tag.gpgsign true

# Test with a commit
git commit -m "test: GPG signing verification"
```

## If Signing Fails

1. Check GPG key: `gpg --list-secret-keys`
2. Set signing key: `git config user.signingkey YOUR_KEY_ID`
3. Report issues in GitHub immediately

## Remember

- NEVER use --no-gpg-sign
- ALL commits must be signed
- Security is non-negotiable

---
*Protecting the integrity of our codebase, one signature at a time.*