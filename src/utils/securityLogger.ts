// Security audit logging utility
export interface SecurityEvent {
  event: string;
  userId?: string;
  details?: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
}

class SecurityLogger {
  private events: SecurityEvent[] = [];
  private maxEvents = 1000; // Keep last 1000 events in memory

  log(event: SecurityEvent) {
    // Add timestamp if not provided
    const logEvent = {
      ...event,
      timestamp: event.timestamp || new Date()
    };

    this.events.unshift(logEvent);
    
    // Keep only recent events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(0, this.maxEvents);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[SECURITY] ${logEvent.severity.toUpperCase()}: ${logEvent.event}`, logEvent.details);
    }

    // In production, you would send this to your logging service
    // Example: send to analytics or monitoring service
  }

  logEncryptionEvent(event: string, success: boolean, userId?: string, details?: Record<string, any>) {
    this.log({
      event: `encryption_${event}`,
      userId,
      details: { success, ...details },
      severity: success ? 'low' : 'medium',
      timestamp: new Date()
    });
  }

  logAuthEvent(event: string, userId?: string, details?: Record<string, any>) {
    this.log({
      event: `auth_${event}`,
      userId,
      details,
      severity: 'medium',
      timestamp: new Date()
    });
  }

  logSuspiciousActivity(event: string, userId?: string, details?: Record<string, any>) {
    this.log({
      event: `suspicious_${event}`,
      userId,
      details,
      severity: 'high',
      timestamp: new Date()
    });
  }

  getRecentEvents(severity?: SecurityEvent['severity']): SecurityEvent[] {
    if (severity) {
      return this.events.filter(event => event.severity === severity);
    }
    return [...this.events];
  }

  getEventsByUser(userId: string): SecurityEvent[] {
    return this.events.filter(event => event.userId === userId);
  }
}

export const securityLogger = new SecurityLogger();
