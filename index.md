---
layout: default
title: "The Gatekeeper Documentation"
---

# The Gatekeeper 🏰

Welcome to the official documentation for **The Gatekeeper**! This project implements a secure, robust, and highly resilient dual-guard authentication and session management system built with Next.js, Iron-Session, and Prisma.

Whether you are a beginner looking to understand the core concepts using intuitive analogies, or a security professional looking to audit and verify our threat defenses, this documentation covers everything you need.

---

## 📖 Table of Contents

Navigate through the chapters below to explore how the magic castle secures its gates:

### 🏰 [Chapter 1: How the Magic Castle Works](01-explanation.md)
*A beginner-friendly, high-level conceptual guide explaining password hashing, secure session cookies, and route guards using playful real-world analogies (Indestructible boxes, magic blenders, and castle guards).*

### 🛡️ [Chapter 2: Security Principles & Threat Modeling](02-principles.md)
*An in-depth look at our core security principles, including Defense in Depth, Least Privilege, Fail-Safe Defaults, and a complete threat modeling analysis mapping attack vectors to specific mitigations.*

### 🔍 [Chapter 3: Security Audit & Code Integrity](03-audit.md)
*A detailed review of our codebase's integrity. Explores sensitive boundaries, authentication workflows, session security parameters, and analyses of potential exploit vectors.*

### 🧬 [Chapter 4: Dual-Guard Architecture](04-cross-check.md)
*Deep dive into our cross-checking security architecture. Learn how the Next.js Middleware (front gate) and server-side `requireAuth` helper (inner chamber guard) work in tandem to ensure zero-bypass safety.*

### 🧪 [Chapter 5: Tinker Experiment & Session Expiry](05-tinker.md)
*An empirical security experiment demonstrating how the session cookie behaves under edge cases, showing validation of absolute vs. idle timeouts, cryptographic tamper resistance, and cookie expiration boundaries.*

### 🤥 [Chapter 6: Lie Detector & Audit Verification](06-lie-detector.md)
*Verification exercises testing the dual-guard mechanism against bypass attempts, invalid secrets, session tampering, and direct database queries to prove the robustness of the system.*

---

## 🚀 Getting Started with the Project

To run this project locally, refer to the [README.md](../README.md) at the root of the repository, or follow the [Deployment Guide](../DEPLOYMENT.md) to set it up in a production-ready environment like Vercel, Fly.io, or Railway.

---

*Securing the gates, one session at a time.* 🛡️
