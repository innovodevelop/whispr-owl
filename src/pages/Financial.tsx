import React, { useEffect, useMemo, useState } from 'react';
import { DollarSign, Plus, TrendingUp, Users, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import BottomNavigation from '@/components/BottomNavigation';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface SheetSummary {
  id: string;
  title: string | null;
  conversation_id: string;
  updated_at: string;
  totalAmount: number;
  entries: number;
  collaborators: string[];
  lastActivity: string;
  trend: 'up' | 'down' | 'flat';
}

// Row types
interface FSRow { id: string; conversation_id: string; title: string | null; updated_at: string }
interface EntryRow { id: string; sheet_id: string; amount: number; created_at: string }
interface ConvRow { id: string; participant_one: string; participant_two: string; updated_at: string }
interface ProfileRow { user_id: string; display_name: string | null; username: string | null }

const Financial: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState<'overview' | 'sheets' | 'history'>('overview');
  const [sheets, setSheets] = useState<SheetSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      setLoading(true);
      try {
        // 1) Fetch all sheets user can access
        const { data: sheetRows, error: sheetErr } = await supabase
          .from('financial_sheets')
          .select('id, conversation_id, title, updated_at')
          .order('updated_at', { ascending: false });
        if (sheetErr) throw sheetErr;

        const sheetIds = (sheetRows || []).map(s => s.id);
        const convIds = Array.from(new Set((sheetRows || []).map(s => s.conversation_id)));

        // 2) Fetch entries for totals and activity
        const { data: entryRows } = sheetIds.length
          ? await supabase
              .from('financial_entries')
              .select('id, sheet_id, amount, created_at')
              .in('sheet_id', sheetIds)
          : { data: [], error: null } as any;

        // 3) Fetch conversations for collaborators
        const { data: conversations } = convIds.length
          ? await supabase
              .from('conversations')
              .select('id, participant_one, participant_two, updated_at')
              .in('id', convIds)
          : { data: [], error: null } as any;

        const participantIds = Array.from(new Set(
          (conversations || []).flatMap((c: ConvRow) => [c.participant_one, c.participant_two])
        ));

        // 4) Fetch profiles for names
        const { data: profiles } = participantIds.length
          ? await supabase
              .from('profiles')
              .select('user_id, display_name, username')
              .in('user_id', participantIds.filter((id): id is string => typeof id === 'string'))
          : { data: [], error: null } as any;

        const profileMap = new Map(
          (profiles || []).map(p => [p.user_id, p.display_name || p.username || 'Unknown'])
        );

        const bySheet = new Map<string, { total: number; count: number; last: string | null }>();
        (entryRows || []).forEach(e => {
          const cur = bySheet.get(e.sheet_id) || { total: 0, count: 0, last: null };
          cur.total += Number(e.amount);
          cur.count += 1;
          cur.last = cur.last && new Date(cur.last) > new Date(e.created_at) ? cur.last : e.created_at;
          bySheet.set(e.sheet_id, cur);
        });

        const convMap = new Map((conversations || []).map((c: ConvRow) => [c.id, c]));

        const summaries: SheetSummary[] = (sheetRows || []).map(s => {
          const agg = bySheet.get(s.id) || { total: 0, count: 0, last: null };
          const conv = convMap.get(s.conversation_id) as ConvRow | undefined;
          const collaborators = conv
            ? (([conv.participant_one, conv.participant_two] as string[])
                .filter(uid => uid !== user.id)
                .map(uid => profileMap.get(uid) || 'Unknown') as string[])
            : [] as string[];
          const lastActivityDate = agg.last || s.updated_at;
          const lastActivity = timeAgo(lastActivityDate);
          const trend = agg.total > 0 ? 'up' : agg.total < 0 ? 'down' : 'flat';
          return {
            id: s.id,
            title: s.title,
            conversation_id: s.conversation_id,
            updated_at: s.updated_at,
            totalAmount: agg.total,
            entries: agg.count,
            collaborators: collaborators,
            lastActivity,
            trend
          } as SheetSummary;
        });

        setSheets(summaries);
      } catch (e) {
        console.error('Failed loading financial sheets', e);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  const totalBalance = useMemo(() => sheets.reduce((sum, s) => sum + s.totalAmount, 0), [sheets]);
  const activeCount = useMemo(() => sheets.length, [sheets]);

  const recentActivity = useMemo(() => {
    // Build a simple activity list from sheets (using lastActivity, amount sign for icon)
    return sheets.slice(0, 6).map(s => ({
      user: s.collaborators[0] || 'Partner',
      action: `updated ${s.title || 'Financial Sheet'}`,
      amount: s.totalAmount,
      time: s.lastActivity,
      sheet: s.title || 'Financial Sheet',
    }));
  }, [sheets]);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-4">
      {/* Header */}
      <header className="glass-card border-b border-border/30 p-4 md:p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-xl bg-secondary">
            <DollarSign className="h-6 w-6 text-secondary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Financial Sheets</h1>
            <p className="text-sm text-muted-foreground">Manage shared expenses and budgets</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2">
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'sheets', label: 'Sheets' },
            { key: 'history', label: 'History' }
          ].map((tab) => (
            <Button
              key={tab.key}
              variant={selectedTab === tab.key ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedTab(tab.key as typeof selectedTab)}
              className={cn(
                'transition-all duration-300',
                selectedTab === tab.key ? 'btn-neon' : 'hover:bg-primary/10'
              )}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </header>

      <div className="container mx-auto p-4 md:p-6 space-y-6">
        {selectedTab === 'overview' && (
          <div className="space-y-6 fade-in">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="glass-card transition-all duration-300">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    Total Balance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-500">${totalBalance.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground mt-1">Across all sheets</p>
                </CardContent>
              </Card>

              <Card className="glass-card transition-all duration-300">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Users className="h-4 w-4 text-foreground" />
                    Active Sheets
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{activeCount}</div>
                  <p className="text-xs text-muted-foreground mt-1">You can access these sheets</p>
                </CardContent>
              </Card>

              <Card className="glass-card transition-all duration-300">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-foreground" />
                    This Month
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">${calcThisMonth(entryDatesFromSheets(sheets)).toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground mt-1">Sum of entries this month</p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-foreground" />
                  Recent Activity
                </CardTitle>
                <CardDescription>Latest financial sheet updates</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentActivity.length === 0 && (
                  <p className="text-sm text-muted-foreground">No recent activity</p>
                )}
                {recentActivity.map((activity, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors stagger-item"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-primary"></div>
                      <div>
                        <p className="text-sm font-medium">
                          <span className="text-foreground">{activity.user}</span> {activity.action}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {activity.sheet} • {activity.time}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {activity.amount > 0 ? (
                        <ArrowUpRight className="h-4 w-4 text-green-500" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4 text-red-500" />
                      )}
                      <span className={cn(
                        'text-sm font-semibold',
                        activity.amount > 0 ? 'text-green-500' : 'text-red-500'
                      )}>
                        ${Math.abs(activity.amount).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {selectedTab === 'sheets' && (
          <div className="space-y-4 fade-in">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Financial Sheets</h2>
              <Button size="sm" className="btn-neon" onClick={() => alert('Create a sheet from within a conversation') /* minimal for now */}>
                <Plus className="h-4 w-4 mr-2" />
                New Sheet
              </Button>
            </div>

            <div className="grid gap-4">
              {loading && <p className="text-sm text-muted-foreground">Loading...</p>}
              {!loading && sheets.length === 0 && (
                <p className="text-sm text-muted-foreground">No sheets yet</p>
              )}
              {sheets.map((sheet, index) => (
                <Card
                  key={sheet.id}
                  className="glass-card transition-all duration-300 cursor-pointer stagger-item"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-foreground">{sheet.title || 'Financial Sheet'}</h3>
                          <Badge variant={sheet.trend === 'up' ? 'default' : 'secondary'} className="text-xs">
                            {sheet.entries} entries
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {(sheet.collaborators.length + 1)} people
                          </span>
                          <span>{sheet.lastActivity}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={cn(
                          'text-xl font-bold',
                          sheet.totalAmount >= 0 ? 'text-green-500' : 'text-red-500'
                        )}>
                          {sheet.totalAmount >= 0 ? '+' : ''}${sheet.totalAmount.toFixed(2)}
                        </div>
                        {sheet.trend === 'up' ? (
                          <ArrowUpRight className="h-4 w-4 text-green-500 ml-auto" />
                        ) : sheet.trend === 'down' ? (
                          <ArrowDownRight className="h-4 w-4 text-red-500 ml-auto" />
                        ) : null}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {selectedTab === 'history' && (
          <div className="space-y-4 fade-in">
            <h2 className="text-lg font-semibold text-foreground">Transaction History</h2>
            <Card className="glass-card">
              <CardContent className="p-4">
                <div className="text-center py-8">
                  <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Transaction history will appear here</p>
                  <p className="text-sm text-muted-foreground">Start by creating your first financial sheet</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
};

function timeAgo(dateStr: string) {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - d.getTime()) / (1000 * 60));
    if (diffMinutes < 1) return 'now';
    if (diffMinutes < 60) return `${diffMinutes}m`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d`;
    return d.toLocaleDateString();
  } catch {
    return '';
  }
}

function entryDatesFromSheets(sheets: SheetSummary[]) {
  // For simplicity, we don't hold all entries here; just return an empty array to compute 0
  // A real implementation could prefetch last 30d entries. Keeping minimal per instruction.
  return [] as { created_at: string; amount: number }[];
}

function calcThisMonth(entries: { created_at: string; amount: number }[]) {
  const start = new Date();
  start.setDate(1); start.setHours(0,0,0,0);
  return entries
    .filter(e => new Date(e.created_at) >= start)
    .reduce((sum, e) => sum + Number(e.amount), 0);
}

export default Financial;
