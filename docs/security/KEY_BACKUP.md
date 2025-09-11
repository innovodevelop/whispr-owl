# Key Backup and Recovery System

## Overview

Our secure messaging application implements a client-side key backup system that allows users to restore their cryptographic keys on new devices while maintaining end-to-end encryption guarantees.

## Backup Architecture

### Client-Side Encryption Model

**Backup Key Derivation**
```
User Backup Passphrase + Salt → PBKDF2 (100,000 iterations) → Backup KEK
Private Keys + Metadata → JSON → Backup KEK + IV → AES-GCM → Encrypted Backup
```

**Multi-Layer Protection**
1. **Local Layer**: Keys wrapped with Local KEK (device-specific passphrase)
2. **Backup Layer**: Wrapped keys re-encrypted with Backup KEK (backup passphrase)
3. **Server Storage**: Only encrypted backup blob stored (no key recovery possible server-side)

### Backup Data Structure

**Encrypted Backup Blob**
```json
{
  "version": "1.0",
  "timestamp": "2025-09-11T20:08:20Z",
  "salt": "base64-encoded-salt",
  "iv": "base64-encoded-iv",
  "encryptedData": "base64-encoded-encrypted-keys",
  "keyDerivationParams": {
    "algorithm": "PBKDF2",
    "iterations": 100000,
    "hash": "SHA-256"
  }
}
```

**Plaintext Key Data (before encryption)**
```json
{
  "identityKeys": {
    "keyId": "identity_user_id",
    "publicKeyJWK": {...},
    "wrappedPrivateKey": "base64-wrapped-key",
    "createdAt": "timestamp"
  },
  "signedPrekeys": [...],
  "oneTimePrekeys": [...],
  "sessionKeys": [...],
  "metadata": {
    "userId": "user-uuid",
    "registrationId": 12345,
    "backupVersion": "1.0"
  }
}
```

## Backup Process

### Creating a Backup

**Step 1: User Authentication**
- Verify user identity with existing device authentication
- Validate access to existing private keys
- Confirm backup passphrase (minimum 12 characters, entropy requirements)

**Step 2: Key Collection**
```typescript
async createBackup(backupPassphrase: string): Promise<string> {
  // Validate no keys in web storage
  this.validateNoKeysInWebStorage();
  
  // Collect all stored keys from IndexedDB
  const storedKeyIds = await this.listStoredKeys();
  const keyData = {};
  
  for (const keyId of storedKeyIds) {
    // Retrieve wrapped keys (already encrypted with local KEK)
    const keyMetadata = await this.getKeyMetadata(keyId);
    keyData[keyId] = keyMetadata;
  }
  
  // Add metadata
  const backupData = {
    keys: keyData,
    metadata: {
      userId: this.currentUserId,
      registrationId: this.registrationId,
      backupVersion: "1.0",
      timestamp: new Date().toISOString()
    }
  };
  
  // Encrypt with backup passphrase
  return await this.encryptBackup(backupData, backupPassphrase);
}
```

**Step 3: Secure Upload**
- Encrypt backup blob with Backup KEK
- Upload encrypted blob to server storage
- Store backup metadata (encrypted) in user profile
- Log backup creation event

### Backup Storage

**Server-Side Storage**
- Encrypted backup blob stored in dedicated table
- No server-side decryption keys or passphrases stored
- Row-level security ensures user can only access own backups
- Backup metadata encrypted with same Backup KEK

**Retention Policy**
- Keep last 5 backup versions per user
- Automatic cleanup of backups older than 1 year
- User can manually delete backup versions
- Deleted backups are cryptographically wiped

## Recovery Process

### Device Setup and Key Restoration

**Step 1: Backup Discovery**
```typescript
async listAvailableBackups(userId: string): Promise<BackupMetadata[]> {
  const { data } = await supabase
    .from('key_backups')
    .select('id, created_at, encrypted_metadata')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
    
  return data.map(backup => ({
    id: backup.id,
    createdAt: backup.created_at,
    // Metadata preview without sensitive data
    preview: this.extractBackupPreview(backup.encrypted_metadata)
  }));
}
```

**Step 2: Backup Decryption**
```typescript
async restoreFromBackup(
  backupId: string, 
  backupPassphrase: string,
  newLocalPassphrase: string
): Promise<boolean> {
  try {
    // Fetch encrypted backup
    const { data } = await supabase
      .from('key_backups')
      .select('encrypted_data, salt, iv')
      .eq('id', backupId)
      .single();
    
    // Decrypt backup with user passphrase
    const backupData = await this.decryptBackup(
      data.encrypted_data,
      backupPassphrase,
      data.salt,
      data.iv
    );
    
    // Re-encrypt keys with new device passphrase
    await this.restoreKeysToDevice(backupData, newLocalPassphrase);
    
    return true;
  } catch (error) {
    console.error('Backup restoration failed:', error);
    return false;
  }
}
```

**Step 3: Key Installation**
- Decrypt backup with provided Backup KEK
- Re-wrap private keys with new Local KEK (new device passphrase)
- Store wrapped keys in new device's IndexedDB
- Validate key integrity and functionality
- Register device with restored identity keys

## Security Guarantees

### Cryptographic Properties

**Forward Secrecy**
- New device cannot decrypt messages sent before restoration
- Historical message keys are not included in backups
- Each session maintains separate forward-secret keys

**Backup Compromise Resistance**
- Stolen backup blob cannot be decrypted without passphrase
- Backup passphrase not stored anywhere on server
- Multiple PBKDF2 iterations resist brute-force attacks

**Device Independence**
- Each device has separate Local KEK
- Compromise of one device doesn't expose backup passphrase
- Backup can be restored to multiple devices independently

### Threat Model Coverage

**Server Compromise**
- Server cannot decrypt backup blobs
- No access to backup passphrases or Local KEKs
- Encrypted metadata prevents information disclosure

**Backup Theft**
- Encrypted backup useless without passphrase
- Strong key derivation resists offline attacks
- No partial information disclosure from backup structure

**Passphrase Compromise**
- User can generate new backup with different passphrase
- Old backups remain encrypted with old passphrase
- Passphrase rotation doesn't require key regeneration

## User Experience

### Backup Creation Flow

1. **Backup Setup**: User chooses strong backup passphrase
2. **Key Collection**: System gathers all private keys from secure storage
3. **Encryption**: Keys encrypted client-side with backup passphrase
4. **Upload**: Encrypted blob uploaded to secure server storage
5. **Verification**: Backup integrity verified with test decryption

### Recovery Flow

1. **Device Setup**: New device installation and user authentication
2. **Backup Discovery**: List available backup versions for user
3. **Passphrase Entry**: User provides backup passphrase
4. **Key Restoration**: Decrypt and install keys on new device
5. **Validation**: Test message decryption to verify success

### Error Handling

**Common Failure Modes**
- Incorrect backup passphrase → Clear error message, retry option
- Corrupted backup blob → Fallback to previous backup version
- Network failure during restore → Resume from last checkpoint
- Key validation failure → Prompt for new backup creation

**Recovery Procedures**
- Manual backup verification tools for advanced users
- Support contact for backup recovery assistance
- Emergency key regeneration if all backups lost
- Audit trail for all backup/restore operations

## Implementation Notes

### Storage Requirements
- IndexedDB for local wrapped keys (5-50MB typical)
- Server backup storage (1-10MB per backup)
- Memory usage during backup/restore (temporary, 10-100MB)

### Performance Considerations
- Backup creation: 2-10 seconds depending on key count
- Backup restoration: 5-30 seconds including validation
- Key derivation optimized for 100,000 PBKDF2 iterations
- Chunked upload/download for large backup blobs

### Compatibility
- Cross-browser IndexedDB implementation
- Progressive enhancement for backup features
- Graceful degradation if backup storage unavailable
- Version compatibility for future backup format changes

---

This backup system ensures users can securely restore their encryption keys on new devices while maintaining all security properties of the end-to-end encryption system.