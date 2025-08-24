import { useSignalProtocol } from '@/hooks/useSignalProtocol';

export const useEncryption = () => {
  const signalProtocol = useSignalProtocol();

  return {
    userKeys: null, // Deprecated - use Signal Protocol instead
    loading: signalProtocol.loading,
    encryptionReady: signalProtocol.initialized,
    getConversationKey: null, // Deprecated - use Signal Protocol instead
    createConversationKey: null, // Deprecated - use Signal Protocol instead
    getUserPublicKey: null, // Deprecated - use Signal Protocol instead
    encryptionPassword: null, // Deprecated - use Signal Protocol instead
    // Export Signal Protocol methods
    ...signalProtocol
  };
};