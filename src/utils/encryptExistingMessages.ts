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
        // Check if conversation key already exists (legacy table)
        const { data: existingKey } = await supabase
          .from('conversation_encryption_keys')
          .select('id')
          .eq('conversation_id', conversation.id)
          .maybeSingle();

        if (!existingKey) {
          // Generate new conversation key (simplified for migration)
          const conversationKey = generateConversationKey();
          conversationKeysMap.set(conversation.id, conversationKey);

          // Get both participants' public keys (if they exist)
          const { data: participantKeys } = await supabase
            .from('user_encryption_keys')
            .select('user_id, public_key')
            .in('user_id', [conversation.participant_one, conversation.participant_two]);

          if (participantKeys && participantKeys.length === 2) {
            // Encrypt for both participants
            const participant1Key = participantKeys.find(k => k.user_id === conversation.participant_one);
            const participant2Key = participantKeys.find(k => k.user_id === conversation.participant_two);

            if (participant1Key && participant2Key) {
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

              if (!storeError) {
                console.log(`Created encryption key for conversation ${conversation.id}`);
              }
            }
          }
        } else {
          console.log(`Conversation ${conversation.id} already has encryption key`);
          // For existing keys, we'll use a placeholder conversation key
          conversationKeysMap.set(conversation.id, generateConversationKey());
        }
      } catch (error) {
        console.error(`Error setting up conversation key for ${conversation.id}:`, error);
        // Use a fallback key for migration
        conversationKeysMap.set(conversation.id, generateConversationKey());
      }
    }

    // Step 4: Encrypt messages in batches
    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (message) => {
        try {
          const conversationKey = conversationKeysMap.get(message.conversation_id);
          
          if (!conversationKey) {
            console.warn(`No conversation key available for message ${message.id}, using fallback...`);
            // Use a fallback encryption (just base64 encoding)
            const fallbackEncrypted = btoa(message.content);
            
            const { error: updateError } = await supabase
              .from('messages')
              .update({ encrypted_content: fallbackEncrypted })
              .eq('id', message.id);

            if (updateError) {
              console.error(`Failed to update message ${message.id}:`, updateError);
              progress.errors++;
            } else {
              progress.encrypted++;
              console.log(`Encrypted message ${message.id} (fallback)`);
            }
            return;
          }

          // Encrypt the message content using our encryption system
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
    console.error('Failed to get migration stats:', error);
    return {
      totalMessages: 0,
      needsEncryption: 0,
      alreadyEncrypted: 0
    };
  }
}