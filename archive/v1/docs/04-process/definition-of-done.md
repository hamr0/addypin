# Definition of Done

## Feature Complete
- [ ] All functional requirements from PRD implemented
- [ ] Code follows existing patterns in codebase
- [ ] TypeScript types are correct (`npm run check` passes)

## Tested
- [ ] Manual testing done locally via `./dev.sh`
- [ ] API endpoints tested with curl/browser
- [ ] Health check passes: `curl http://localhost:5000/api/health`

## Deployed
- [ ] Changes pushed to GitHub
- [ ] Deployed to staging via GitHub Actions
- [ ] Verified on https://staging.addypin.com
- [ ] Deployed to production via GitHub Actions
- [ ] Verified on https://addypin.com
- [ ] Health check passes on production

## Documentation
- [ ] API changes documented in `docs/02-features/api-documentation.md`
- [ ] Schema changes noted in `docs/00-context/system-state.md`
- [ ] Implementation decision logged if significant
