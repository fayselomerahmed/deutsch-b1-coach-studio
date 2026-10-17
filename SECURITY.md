# Security

Never commit API keys, service-account credentials, signing certificates, provisioning profiles, personal contact details, or real customer data. Keep local configuration in ignored files; use the documented example configuration for development. Privileged credentials belong on a trusted server, never in an iOS client.

## Reporting a vulnerability

Use GitHub's private vulnerability reporting when it is available. Otherwise contact the repository owner through GitHub to arrange a private report. Do not open a public issue containing credentials, personal data, or exploit details.

If a credential is exposed, revoke or rotate it at its provider immediately. Removing a file or rewriting Git history does not invalidate a credential or remove copies held elsewhere.

## Verification

The security workflow scans the complete checked-out Git history with a pinned Gitleaks release. A clean scan is one check, not a complete security assessment. Review authentication, authorization, network behavior, dependencies, privacy disclosures, and release configuration before distributing an app. Demo features and incomplete external integrations must remain clearly identified in the README.

Use synthetic test data. Review the staged diff and run the security scan before publishing changes. Dependency updates should be tested before merging; never put secrets in issue reports or build logs.

