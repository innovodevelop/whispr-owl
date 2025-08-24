import React from 'react';
import { Shield, ShieldCheck, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EncryptionStatusProps {
  className?: string;
  showText?: boolean;
  loading?: boolean;
  initialized?: boolean;
}

export const EncryptionStatus: React.FC<EncryptionStatusProps> = ({
  className,
  showText = false,
  loading = false,
  initialized = false
}) => {
  if (loading) {
    return (
      <div className={cn("flex items-center gap-2 text-muted-foreground", className)}>
        <Loader2 className="h-4 w-4 animate-spin" />
        {showText && <span className="text-xs">Setting up Signal Protocol...</span>}
      </div>
    );
  }

  if (initialized) {
    return (
      <div className={cn("flex items-center gap-1 text-green-600 dark:text-green-400", className)}>
        <ShieldCheck className="h-4 w-4" />
        {showText && <span className="text-xs">Signal Protocol Active</span>}
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