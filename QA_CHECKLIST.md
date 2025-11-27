# QA Checklist for WCAG Master MVP

## Core Workflow
- [ ] Sign up (email, SSO)
- [ ] Upload valid HTML file
- [ ] Exceed daily upload quota (expect error)
- [ ] Upload invalid file (expect error)
- [ ] Process file (expect success)
- [ ] Iterate/refine (up to 3x, expect error on 4th)
- [ ] Rate iteration
- [ ] Download project (with and without iterations)
- [ ] Sign out/in, repeat flows
- [ ] SSO callback (expect redirect)

## Error/Edge Cases
- [ ] Network failure during upload/process/download
- [ ] Backend returns error (expect user feedback)
- [ ] Download with no iterations (expect error)

## Accessibility
- [ ] Keyboard navigation for all flows
- [ ] Screen reader labels for all interactive elements

## Loading States
- [ ] Loading indicators for upload, process, download, auth

## Monitoring
- [ ] Sentry logs errors in frontend and backend
