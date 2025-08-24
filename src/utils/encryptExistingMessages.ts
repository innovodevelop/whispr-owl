import { supabase } from "@/integrations/supabase/client";
import { encryptMessage, generateConversationKey } from "@/lib/encryption";

export interface MigrationProgress {
  total: number;
  encrypted: number;
  errors: number;
  status: 'idle' | 'running' | 'completed' | 'error';
}

export interface EncryptionMigrationOptions {
  onProgress?: (progress: MigrationProgress) => void;
  batchSize?: number;
}

/**
 * Encrypts existing messages in the database retroactively using Signal Protocol-inspired encryption
 * This should be run once after implementing the new encryption system
 */
export async function encryptExistingMessages(options: EncryptionMigrationOptions = {}) {
  const { onProgress, batchSize = 10 } = options;
  
  try {
    console.log('Starting Signal Protocol encryption migration for existing messages...');
    
    // Get all messages that need encryption
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('id, conversation_id, content, message_type, encrypted_content')
      .is('encrypted_content', null) // Only messages without encryption
      .neq('message_type', 'financial_notification'); // Don't encrypt financial notifications

    if (msgError) {
      throw new Error(`Failed to fetch messages: ${msgError.message}`);
    }

    const progress: MigrationProgress = {
      total: messages?.length || 0,
      encrypted: 0,
      errors: 0,
      status: 'running'
    };

    onProgress?.(progress);

    if (!messages || messages.length === 0) {
      progress.status = 'completed';
      onProgress?.(progress);
      console.log('No messages need encryption migration');
      return progress;
    }

    // For our simplified Signal Protocol-inspired system, we'll use a conversation key per message
    // In a full implementation, this would use proper Signal Protocol sessions

    // Encrypt messages in batches
    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (message) => {
        try {
          // Generate a conversation key for this encryption (simplified approach)
          const conversationKey = generateConversationKey();

          // Encrypt the message content using our Signal Protocol-inspired encryption system
          const encryptedContent = await encryptMessage(message.content, conversationKey);

          // Update the message with encrypted content and redact plaintext
          const { error: updateError } = await supabase
            .from('messages')
            .update({ 
              encrypted_content: encryptedContent,
              content: '[encrypted]' // Redact plaintext from database
            })
            .eq('id', message.id);

          if (updateError) {
            console.error(`Failed to update message ${message.id}:`, updateError);
            progress.errors++;
          } else {
            progress.encrypted++;
            console.log(`Encrypted message ${message.id} with Signal Protocol-inspired encryption`);
          }
        } catch (error) {
          console.error(`Error encrypting message ${message.id}:`, error);
          progress.errors++;
        }
      }));

      // Update progress
      onProgress?.(progress);
      
      // Small delay to prevent overwhelming the database
      if (i + batchSize < messages.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    progress.status = progress.errors === 0 ? 'completed' : 'error';
    onProgress?.(progress);

    console.log(`Signal Protocol encryption migration completed: ${progress.encrypted} encrypted, ${progress.errors} errors`);
    return progress;

  } catch (error) {
    console.error('Signal Protocol encryption migration failed:', error);
    const errorProgress: MigrationProgress = {
      total: 0,
      encrypted: 0,
      errors: 1,
      status: 'error'
    };
    onProgress?.(errorProgress);
    throw error;
  }
}

/**
 * Check how many messages need encryption
 */
export async function getEncryptionMigrationStats() {
  try {
    const { data: messages, error } = await supabase
      .from('messages')
      .select('id, message_type, encrypted_content')
      .is('encrypted_content', null)
      .neq('message_type', 'financial_notification');

    if (error) {
      throw error;
    }

    const { data: allMessages } = await supabase
      .from('messages')
      .select('id, encrypted_content')
      .neq('message_type', 'financial_notification');

    return {
      totalMessages: allMessages?.length || 0,
      needsEncryption: messages?.length || 0,
      alreadyEncrypted: (allMessages?.length || 0) - (messages?.length || 0)
    };
  } catch (error) {
    console.error('Failed to get encryption migration stats:', error);
    return {
      totalMessages: 0,
      needsEncryption: 0,
      alreadyEncrypted: 0
    };
  }
}