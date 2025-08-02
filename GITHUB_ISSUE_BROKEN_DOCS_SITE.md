# [BLOCKER] GitHub Pages Documentation Site Has Broken Links and Styling Issues

## Issue Summary
The Semantest documentation site at https://semantest.github.io/workspace/ is showing broken links and styling errors.

## Root Cause Analysis
After investigation, I found:

1. **Dual Documentation Structure**: We have two separate documentation setups:
   - `/docs/` - Main documentation with Jekyll setup (recently updated with new content)
   - `/github-pages-setup/docusaurus/docs/` - Docusaurus-based documentation being deployed to GitHub Pages

2. **BaseURL Mismatch**: The Docusaurus config has `baseUrl: '/workspace/'` which may not match the actual deployment location

3. **Content Sync Issue**: The new documentation I created is in `/docs/` but GitHub Pages is deploying from the Docusaurus directory

## Proposed Solutions

### Option 1: Migrate to Single Documentation System (Recommended)
- Copy all the new narrative-driven content from `/docs/` to `/github-pages-setup/docusaurus/docs/`
- Update the Docusaurus configuration to match our needs
- Ensure all links are relative and work with the baseUrl

### Option 2: Switch to Jekyll-based GitHub Pages
- Use the `/docs/` directory directly with Jekyll
- Update the GitHub Actions workflow to build from `/docs/` instead of Docusaurus
- This would be simpler but might lose some Docusaurus features

### Option 3: Fix Current Docusaurus Setup
- Update broken links in existing Docusaurus docs
- Fix the baseUrl configuration
- Add the new content alongside existing docs

## Immediate Actions Needed

1. **Decision Required**: Which documentation system should we use going forward?
2. **BaseURL Fix**: If keeping Docusaurus, should the site be at `/workspace/` or at the root?
3. **Content Migration**: Should I migrate the new storytelling-focused docs to Docusaurus?

## New Documentation Created
I've created engaging, narrative-driven documentation in `/docs/`:
- `/docs/getting-started/README.md` - Story-driven getting started guide
- `/docs/tutorials/real-world-amazon-testing.md` - Practical tutorial with Amazon
- `/docs/success-stories/README.md` - Real user success stories
- `/docs/index.md` - New landing page with modern design
- `/docs/tutorials/README.md` - Tutorial hub

These files use storytelling to make Semantest more approachable and engaging.

## Team Input Needed
- **@eva**: Should we keep the Docusaurus setup or switch to Jekyll?
- **@dana**: Can you help with the GitHub Actions deployment configuration?
- **@alex**: Any preference on the documentation framework?
- **@rydnr**: Which approach would you prefer for fixing the site?

---
Created by: Sam (Scribe)
Priority: BLOCKER
Status: Awaiting team decision