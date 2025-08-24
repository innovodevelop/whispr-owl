// Comprehensive encryption management using Signal Protocol
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSignalProtocol } from '@/hooks/useSignalProtocol';

export const useEncryption = () => {
  const { user } = useAuth();
  const signalProtocol = useSignalProtocol();
  const [isReady, setIsReady] = useState(false);

  // Monitor Signal Protocol initialization
  useEffect(() => {
    setIsReady(signalProtocol.initialized && !!user);
  }, [signalProtocol.initialized, user]);

  // Encrypt a message for a specific conversation
  const encryptMessage = useCallback(async (
    message: string,
    conversationId: string,
    recipientUserId: string
  ): Promise<string | null> => {
    if (!isReady) {
      console.warn('[Encryption] Signal Protocol not ready');
      return null;
    }

    try {
      console.log('[Encryption] Encrypting message for conversation:', conversationId);
      const encrypted = await signalProtocol.encryptMessage(
        message,
        conversationId,
        recipientUserId
      );
      
      if (!encrypted) {
        console.error('[Encryption] Failed to encrypt message');
        return null;
      }

      console.log('[Encryption] Message encrypted successfully');
      return encrypted;
    } catch (error) {
      console.error('[Encryption] Error encrypting message:', error);
      return null;
    }
  }, [isReady, signalProtocol.encryptMessage]);

  // Decrypt a message from a specific conversation
  const decryptMessage = useCallback(async (
    encryptedMessage: string,
    conversationId: string,
    senderUserId: string
  ): Promise<string | null> => {
    if (!isReady) {
      console.warn('[Encryption] Signal Protocol not ready');
      return null;
    }

    try {
      console.log('[Encryption] Decrypting message from conversation:', conversationId);
      const decrypted = await signalProtocol.decryptMessage(
        encryptedMessage,
        conversationId,
        senderUserId
      );
      
      if (!decrypted) {
        console.error('[Encryption] Failed to decrypt message');
        return null;
      }

      console.log('[Encryption] Message decrypted successfully');
      return decrypted;
    } catch (error) {
      console.error('[Encryption] Error decrypting message:', error);
      return null;
    }
  }, [isReady, signalProtocol.decryptMessage]);

  // Check if we can communicate securely with a user
  const canCommunicateWith = useCallback(async (userId: string): Promise<boolean> => {
    if (!isReady) return false;
    
    try {
      return await signalProtocol.canCommunicateWith(userId);
    } catch (error) {
      console.error('[Encryption] Error checking communication capability:', error);
      return false;
    }
  }, [isReady, signalProtocol.canCommunicateWith]);

  // Get encryption status for display
  const getEncryptionStatus = useCallback(() => {
    if (signalProtocol.loading) {
      return { status: 'loading', message: 'Setting up Signal Protocol...' };
    }
    
    if (signalProtocol.initialized) {
      return { status: 'active', message: 'Signal Protocol Active' };
    }
    
    return { status: 'unavailable', message: 'Encryption unavailable' };
  }, [signalProtocol.loading, signalProtocol.initialized]);

  return {
    isReady,
    encryptMessage,
    decryptMessage,
    canCommunicateWith,
    getEncryptionStatus,
    signalProtocol: {
      ...signalProtocol,
      registrationId: signalProtocol.registrationId
    }
  };
};