# DocFill AI

## Current State
Project scaffolding exists (frontend shell, no backend Motoko code, no app components). Previous build failed before any code was generated.

## Requested Changes (Diff)

### Add
- User authentication (login/logout via Internet Identity)
- Master Profile dashboard: form to save personal details (name, email, address, phone, date of birth, ID number)
- PDF Upload Portal: drag-and-drop zone to upload PDF documents
- AI field detection simulation: after upload, show detected form fields with confidence indicators
- Auto-fill logic: automatically populate detected fields with matching Master Profile data
- Download section: list of processed/filled documents with download action
- Bento Box-style layout for the main dashboard

### Modify
- Nothing (new project)

### Remove
- Nothing

## Implementation Plan
1. Backend: user profile storage (CRUD for personal details), document metadata storage (filename, upload timestamp, status, field mappings), auto-fill simulation logic
2. Frontend: authentication gate with login/logout, Master Profile page with editable form, PDF Upload page with dropzone, AI detection simulation UI (field list with match confidence), auto-fill preview, Documents page with download list, Bento Box dashboard layout, Inter font, Slate Blue + White color theme
