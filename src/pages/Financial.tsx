import React, { useState } from 'react';
import { DollarSign, Plus, TrendingUp, Users, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import BottomNavigation from '@/components/BottomNavigation';
import { cn } from '@/lib/utils';

const Financial: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState<'overview' | 'sheets' | 'history'>('overview');

  const mockFinancialSheets = [
    {
      id: '1',
      title: 'Vacation Fund',
      collaborators: ['Alice', 'Bob'],
      totalAmount: 1250.50,
      entries: 8,
      lastActivity: '2 hours ago',
      trend: 'up'
    },
    {
      id: '2', 
      title: 'Dinner Split',
      collaborators: ['Carol'],
      totalAmount: -45.75,
      entries: 3,
      lastActivity: '1 day ago',
      trend: 'down'
    },
    {
      id: '3',
      title: 'Monthly Expenses',
      collaborators: ['Dave', 'Emma', 'Frank'],
      totalAmount: 892.30,
      entries: 15,
      lastActivity: '3 days ago',
      trend: 'up'
    }
  ];

  const recentActivity = [
    { user: 'Alice', action: 'added Hotel booking', amount: 320.50, time: '2h ago', sheet: 'Vacation Fund' },
    { user: 'Bob', action: 'paid for Groceries', amount: -85.20, time: '5h ago', sheet: 'Monthly Expenses' },
    { user: 'Carol', action: 'split Restaurant bill', amount: -22.88, time: '1d ago', sheet: 'Dinner Split' },
    { user: 'You', action: 'created Gas expenses', amount: 45.60, time: '2d ago', sheet: 'Monthly Expenses' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background/95 pb-20 md:pb-4">
      {/* Header */}
      <header className="glass-card border-b border-border/30 p-4 md:p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-xl bg-gradient-to-r from-primary to-secondary shadow-[var(--shadow-glow)]">
            <DollarSign className="h-6 w-6 text-primary-foreground" />
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
                "transition-all duration-300",
                selectedTab === tab.key 
                  ? "btn-neon shadow-lg" 
                  : "hover:bg-primary/10"
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
              <Card className="glass-card hover:neon-card transition-all duration-300">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    Total Balance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-500">$2,097.05</div>
                  <p className="text-xs text-muted-foreground mt-1">+12.5% from last month</p>
                </CardContent>
              </Card>

              <Card className="glass-card hover:neon-card transition-all duration-300">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    Active Sheets
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{mockFinancialSheets.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">2 with recent activity</p>
                </CardContent>
              </Card>

              <Card className="glass-card hover:neon-card transition-all duration-300">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-secondary" />
                    This Month
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">$324.15</div>
                  <p className="text-xs text-muted-foreground mt-1">7 transactions</p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Recent Activity
                </CardTitle>
                <CardDescription>Latest financial sheet updates</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
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
                          <span className="text-primary">{activity.user}</span> {activity.action}
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
                        "text-sm font-semibold",
                        activity.amount > 0 ? "text-green-500" : "text-red-500"
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
              <Button size="sm" className="btn-neon">
                <Plus className="h-4 w-4 mr-2" />
                New Sheet
              </Button>
            </div>

            <div className="grid gap-4">
              {mockFinancialSheets.map((sheet, index) => (
                <Card 
                  key={sheet.id} 
                  className="glass-card hover:neon-card transition-all duration-300 cursor-pointer stagger-item"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-foreground">{sheet.title}</h3>
                          <Badge variant={sheet.trend === 'up' ? 'default' : 'secondary'} className="text-xs">
                            {sheet.entries} entries
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {sheet.collaborators.length + 1} people
                          </span>
                          <span>{sheet.lastActivity}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={cn(
                          "text-xl font-bold",
                          sheet.totalAmount >= 0 ? "text-green-500" : "text-red-500"
                        )}>
                          {sheet.totalAmount >= 0 ? '+' : ''}${sheet.totalAmount.toFixed(2)}
                        </div>
                        {sheet.trend === 'up' ? (
                          <ArrowUpRight className="h-4 w-4 text-green-500 ml-auto" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4 text-red-500 ml-auto" />
                        )}
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

export default Financial;