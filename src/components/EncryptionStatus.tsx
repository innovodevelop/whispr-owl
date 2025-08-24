import React from 'react';
import { Shield, ShieldCheck, Loader2 } from 'lucide-react';
import { useEncryption } from '@/hooks/useEncryption';
import { cn } from '@/lib/utils';

interface EncryptionStatusProps {
  className?: string;
  showText?: boolean;
}

export const EncryptionStatus: React.FC<EncryptionStatusProps> = ({
  className,
  showText = false
}) => {
  const { loading, encryptionReady } = useEncryption();

  if (loading) {
    return (
      <div className={cn("flex items-center gap-2 text-muted-foreground", className)}>
        <Loader2 className="h-4 w-4 animate-spin" />
        {showText && <span className="text-xs">Setting up encryption...</span>}
      </div>
    );
  }

  if (encryptionReady) {
    return (
      <div className={cn("flex items-center gap-2 text-green-600 dark:text-green-400", className)}>
        <ShieldCheck className="h-4 w-4" />
        {showText && <span className="text-xs">End-to-end encrypted</span>}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2 text-amber-600 dark:text-amber-400", className)}>
      <Shield className="h-4 w-4" />
      {showText && <span className="text-xs">Encryption unavailable</span>}
    </div>
  );
};