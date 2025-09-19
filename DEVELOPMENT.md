# Development Workflow

This document outlines the development workflow and branch strategy for the Taiga Shopify Theme.

## Branch Strategy

### Main Branches

- **`main`** - Production branch
  - Connected to live Shopify store
  - Only stable, tested code
  - Protected branch (requires PR reviews)
  - No direct pushes allowed

- **`develop`** - Development branch
  - Connected to preview/development Shopify store
  - Active development and integration
  - All new features merge here first
  - Default branch for development

### Supporting Branches

- **Feature branches** - `feature/branch-name`
  - Created from `develop`
  - For individual features or bug fixes
  - Merged back to `develop` when complete

- **Hotfix branches** - `hotfix/branch-name` (if needed)
  - Created from `main` for urgent production fixes
  - Merged to both `main` and `develop`

## Workflow Process

### For New Features

1. **Start from develop**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/your-feature-name
   ```

2. **Develop and test locally**
   - Make your changes
   - Test thoroughly
   - Commit with clear messages

3. **Push feature branch**
   ```bash
   git push -u origin feature/your-feature-name
   ```

4. **Merge to develop**
   ```bash
   git checkout develop
   git merge feature/your-feature-name
   git push origin develop
   ```
   - This deploys to preview/development store

5. **Create Release PR**
   - When ready for production, create PR from `develop` to `main`
   - Review and test on preview store
   - Merge to deploy to live store

### For Hotfixes (Urgent Production Fixes)

1. **Start from main**
   ```bash
   git checkout main
   git pull origin main
   git checkout -b hotfix/fix-description
   ```

2. **Fix and test**
   - Make minimal, focused changes
   - Test thoroughly

3. **Merge to both branches**
   ```bash
   # Merge to main (production)
   git checkout main
   git merge hotfix/fix-description
   git push origin main

   # Merge to develop (keep in sync)
   git checkout develop
   git merge hotfix/fix-description
   git push origin develop
   ```

## Shopify Integration

### Live Store (Production)
- Connected to `main` branch
- Only receives tested, approved code
- Manual deployment for control

### Preview Store (Development)
- Connected to `develop` branch
- Receives all development changes
- Can be connected to auto-deploy from `develop`

### Local Development
- Use Shopify CLI for local development
- Push changes to feature branches or `develop`
- Test locally before pushing

## Best Practices

### Commit Messages
- Use clear, descriptive commit messages
- Include context about what and why
- Reference issues when applicable

### Code Reviews
- All changes to `main` require PR review
- Test changes in preview store before merging to `main`
- Consider setting up required status checks

### Branch Protection
To set up branch protection on GitHub:
1. Go to repository Settings → Branches
2. Add protection rule for `main`:
   - Require pull request reviews
   - Require status checks to pass
   - Restrict pushes to matching branches

## Emergency Procedures

### Rolling Back Production
If issues occur on live site:
1. Identify last known good commit on `main`
2. Revert or create hotfix
3. Deploy fix immediately
4. Update `develop` with the fix

### Syncing Branches
If branches get out of sync:
```bash
# Update develop with main changes
git checkout develop
git merge main
git push origin develop
```

## Current Status

- **`main`**: Production branch (live store)
- **`develop`**: Development branch (preview store)
- All recent floating cart button work is available on both branches
- Ready for feature development on `develop` branch