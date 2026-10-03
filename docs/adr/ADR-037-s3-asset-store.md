# ADR-037 — Evidence photos live in S3, not on a filesystem volume

- **Date:** 2026-10-03
- **Status:** Accepted
- **Owners:** the team
- **Related:** DEC-007, F-004, API-014, T-005, T-008

### Context

`docs/system-design.md` chose a content-addressed filesystem volume for uploaded photos, as "one less
service in 12 hours", with S3 named as the target for a real deployment. A private S3 bucket and an EC2
instance role that can read and write it already exist and were tested before the build.

### Why now

The upload path (API-008) and the photo route (API-014) are built tonight. Where the bytes go decides
both.

### Options considered

1. **Filesystem volume on the host** — pros: no SDK, no network call / cons: tied to one host; lost if the instance is replaced; no AWS story beyond the instance.
2. **Private S3 bucket through the instance role** — pros: survives the host; no keys on the server; the AWS part of the build is real / cons: an SDK call per upload and per read; presigned URLs signed with role credentials expire when the credentials rotate (about every 6 hours).

### Decision

Store photos in the private bucket under `assets/<sha256>` (the SHA-256 of the stored, metadata-stripped
bytes), with the content type set at upload. Block Public Access stays on. API-014 stays the public URL
(`/api/v1/assets/{sha256}`); the API either streams the object or answers with a short-lived presigned URL
generated per request, never a stored one. The API reaches S3 through the EC2 instance role; no AWS keys
are in the environment. EXIF stripping and the type and size checks (T-005, T-008) happen before upload.

### Why this option

The bucket and role are already provisioned and verified, so the extra cost is one SDK call. It removes
the single-host limit the filesystem choice accepted.

### Overrides

- **Prior ADRs:** none.
- **Doc or plan truth:** `docs/system-design.md` §2 (asset store row), §3, §4 (filesystem row), §5; `docs/security.md` §3 (where public photos live), §7. Updated in the same change.
- **Out of scope:** Does not change API-014's path or contract.

### Consequences

- **Easier:** photos survive an instance rebuild; the AWS integration is genuine.
- **Harder or owed:** local development needs either AWS credentials for the bucket or a stub; tests stub S3. The instance role cannot delete objects, which matches BR-002.
- **Follow-up:** none.
