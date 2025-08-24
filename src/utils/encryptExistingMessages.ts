import { supabase } from "@/integrations/supabase/client";
import { encryptMessage, generateConversationKey, encryptConversationKey } from "@/lib/encryption";

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
 * Encrypts existing messages in the database retroactively
 * This should be run once after implementing encryption
 */
export async function encryptExistingMessages(options: EncryptionMigrationOptions = {}) {
  const { onProgress, batchSize = 10 } = options;
  
  try {
    console.log('Starting encryption migration for existing messages...');
    
    // Step 1: Get all conversations that need encryption keys
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('id, participant_one, participant_two')
      .eq('status', 'accepted');

    if (convError) {
      throw new Error(`Failed to fetch conversations: ${convError.message}`);
    }

    // Step 2: Get all messages that need encryption
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

    // Step 3: Create conversation encryption keys for conversations that don't have them
    const conversationKeysMap = new Map();
    
    for (const conversation of conversations || []) {
      try {
        // Check if conversation key already exists
        const { data: existingKey } = await supabase
          .from('conversation_encryption_keys')
          .select('id')
          .eq('conversation_id', conversation.id)
          .maybeSingle();

        if (!existingKey) {
          // Generate new conversation key
          const conversationKey = generateConversationKey();
          conversationKeysMap.set(conversation.id, conversationKey);

          // Get both participants' public keys
          const { data: participantKeys, error: keysError } = await supabase
            .from('user_encryption_keys')
            .select('user_id, public_key')
            .in('user_id', [conversation.participant_one, conversation.participant_two]);

          if (keysError || !participantKeys || participantKeys.length !== 2) {
            console.warn(`Could not get participant keys for conversation ${conversation.id}, skipping...`);
            continue;
          }

          // Encrypt for both participants
          const participant1Key = participantKeys.find(k => k.user_id === conversation.participant_one);
          const participant2Key = participantKeys.find(k => k.user_id === conversation.participant_two);

          if (!participant1Key || !participant2Key) {
            console.warn(`Missing participant keys for conversation ${conversation.id}, skipping...`);
            continue;
          }

          const encryptedForP1 = encryptConversationKey(conversationKey, participant1Key.public_key);
          const encryptedForP2 = encryptConversationKey(conversationKey, participant2Key.public_key);

          // Store encrypted keys
          const { error: storeError } = await supabase
            .from('conversation_encryption_keys')
            .insert({
              conversation_id: conversation.id,
              encrypted_key_for_participant_one: encryptedForP1,
              encrypted_key_for_participant_two: encryptedForP2,
              key_version: 1
            });

          if (storeError) {
            console.error(`Failed to store conversation key for ${conversation.id}:`, storeError);
            continue;
          }

          console.log(`Created encryption key for conversation ${conversation.id}`);
        } else {
          // Key already exists, we'll need to decrypt it for migration
          console.log(`Conversation ${conversation.id} already has encryption key`);
        }
      } catch (error) {
        console.error(`Error setting up conversation key for ${conversation.id}:`, error);
      }
    }

    // Step 4: Encrypt messages in batches
    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (message) => {
        try {
          const conversationKey = conversationKeysMap.get(message.conversation_id);
          
          if (!conversationKey) {
            console.warn(`No conversation key available for message ${message.id}, skipping...`);
            progress.errors++;
            return;
          }

          // Encrypt the message content
          const encryptedContent = encryptMessage(message.content, conversationKey);

          // Update the message with encrypted content
          const { error: updateError } = await supabase
            .from('messages')
            .update({ encrypted_content: encryptedContent })
            .eq('id', message.id);

          if (updateError) {
            console.error(`Failed to update message ${message.id}:`, updateError);
            progress.errors++;
          } else {
            progress.encrypted++;
            console.log(`Encrypted message ${message.id}`);
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

    console.log(`Migration completed: ${progress.encrypted} encrypted, ${progress.errors} errors`);
    return progress;

  } catch (error) {
    console.error('Migration failed:', error);
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

    return {
      totalMessages: messages?.length || 0,
      needsEncryption: messages?.length || 0,
      alreadyEncrypted: 0
    };
  } catch (error) {
    console.error('Failed to get migration stats:', error);
    return {
      totalMessages: 0,
      needsEncryption: 0,
      alreadyEncrypted: 0
    };
  }
}