# End-to-End Encryption Model

## Overview

This document describes the end-to-end encryption (E2EE) model implemented in our secure messaging application, based on the Signal Protocol with enhanced security measures.

## Cryptographic Foundations

### Key Types and Algorithms

**Identity Keys**
- **Algorithm**: X25519 (Elliptic Curve Diffie-Hellman)
- **Purpose**: Long-term identity verification and key exchange
- **Storage**: Private keys ONLY on client (non-extractable WebCrypto), public keys in database
- **Lifecycle**: Generated once per user, rotated only when compromised

**Ephemeral Keys**
- **Algorithm**: X25519 for key exchange, Ed25519 for signatures
- **Purpose**: Forward secrecy through one-time use keys
- **Storage**: Private keys ONLY on client (non-extractable WebCrypto), public keys in database
- **Lifecycle**: Generated in batches, consumed once, automatically rotated

**Message Encryption**
- **Algorithm**: AES-GCM with 256-bit keys
- **Purpose**: Symmetric encryption of message content
- **Key Derivation**: HKDF-SHA256 from Signal Protocol double ratchet
- **Nonce**: Random 96-bit IV per message

**Session Keys**
- **Algorithm**: AES-GCM with 256-bit keys derived from X25519 ECDH
- **Purpose**: Symmetric encryption for message content
- **Storage**: Cached client-side in memory only, derived keys stored encrypted in database
- **Lifecycle**: Rotated with each message for forward secrecy

## Security Architecture

### Private Key Protection

**Client-Side Only Storage**
- All private keys generated using WebCrypto API with `extractable: false`
- Private keys never transmitted to server or stored in database
- Keys wrapped with Local Key Encryption Key (LKEK) derived from user passphrase
- Encrypted keys stored in IndexedDB (never localStorage/sessionStorage)

**Key Wrapping Process**
```
User Passphrase + Salt → PBKDF2 (100,000 iterations) → LKEK
Private Key + LKEK + IV → AES-GCM → Wrapped Key → IndexedDB
```

**Server Storage (Public Keys Only)**
- Only public keys and signatures stored server-side
- Database policies prevent cross-user key access
- All private key columns removed from database schema

### Message Flow Security

**Encryption Process**
1. Generate ephemeral key pair for sender
2. Retrieve recipient's public identity and prekeys
3. Perform X25519 key exchange to derive shared secret
4. Use HKDF to derive message encryption key
5. Encrypt message with AES-GCM
6. Store only encrypted content server-side

**Decryption Process**
1. Retrieve encrypted message and sender's ephemeral public key
2. Use local private keys to derive shared secret
3. Derive decryption key using HKDF
4. Decrypt message content with AES-GCM
5. Display plaintext (never stored unencrypted)

### Forward Secrecy

**Double Ratchet Implementation**
- New ephemeral keys generated for each message
- Previous keys immediately deleted after use
- Compromise of current keys cannot decrypt past messages
- Chain keys evolve with each message

**Prekey Rotation**
- One-time prekeys consumed after single use
- New prekeys automatically generated and uploaded
- Signed prekeys rotated periodically
- Old prekeys securely deleted from all storage

## Database Security Model

### Row Level Security (RLS)

**Messages Table**
- Users can only access messages from their own conversations
- Message content stored encrypted (plaintext redacted by triggers)
- Burn-on-read messages automatically deleted after reading

**Key Tables**  
- Identity keys: Users can only access their own private keys (now client-side only)
- Public keys: Accessible only to conversation partners
- Session data: Isolated per user with conversation context

**Profile Privacy**
- Phone numbers strictly isolated to owning user only
- Profile data accessible only to contacts and conversation partners
- No enumeration or bulk access to user data

### Database Functions

**Security Definer Functions**
- Minimal privilege escalation with explicit user checks
- No dynamic SQL execution
- Input validation and sanitization
- Audit logging for all security-sensitive operations

## Implementation Security Features

### Runtime Protection

**Key Validation**
- Automatic detection of keys in localStorage/sessionStorage (throws error)
- Non-extractable key validation on generation
- Runtime checks prevent key serialization or network transmission

**Abuse Prevention**
- Rate limiting on key operations and message sending
- OTP expiry reduced to 60 seconds
- Leaked password protection enabled
- Account lockout on repeated failed attempts

**Audit Logging**
- All security-sensitive operations logged
- IP address and user agent tracking
- Failed authentication attempts monitored
- Key generation and usage events recorded

## Threat Model

### Protected Against

**Server Compromise**
- Private keys never accessible server-side
- Message content encrypted at rest
- No plaintext user data in logs or backups

**Account Takeover**
- Private keys remain protected even with account access
- Additional passphrase required for key unwrapping
- Audit trail of all key operations

**Network Interception**
- All communications use TLS 1.3+
- Message content encrypted before transmission
- Key exchange uses authenticated protocols

**Device Theft**
- Private keys stored encrypted in secure browser storage
- Passphrase required to decrypt keys
- Remote logout clears all cached keys

### Residual Risks

**Client-Side Attacks**
- XSS could potentially access decrypted keys in memory
- Malicious browser extensions with broad permissions
- Physical access during active session

**Implementation Bugs**
- Cryptographic implementation errors
- Side-channel attacks on key operations
- Timing attacks on encryption/decryption

## Recovery and Backup

### Key Recovery
- Recovery phrases encrypted client-side before storage
- Recovery requires both database hash and client passphrase
- No server-side key recovery possible

### Message History
- New devices cannot decrypt historical messages (forward secrecy)
- Users must explicitly backup/restore message keys for history access
- Backup keys encrypted with separate backup passphrase

## Compliance and Standards

**Cryptographic Standards**
- NIST-approved algorithms (AES-256, SHA-256, X25519, Ed25519)
- RFC-compliant implementations (Signal Protocol, HKDF, PBKDF2)
- Constant-time implementations to prevent side-channel attacks

**Security Best Practices**
- Defense in depth with multiple security layers
- Principle of least privilege for all operations
- Regular security audits and penetration testing
- Incident response procedures for key compromise

---

This E2EE model ensures that even complete server compromise cannot expose user private keys or message contents, maintaining cryptographic privacy under all threat scenarios except client-side compromise during active sessions.