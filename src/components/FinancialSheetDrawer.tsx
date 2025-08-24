import { useState } from "react";
import { Plus, Trash2, DollarSign, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useFinancialSheet, type FinancialEntry } from "@/hooks/useFinancialSheet";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface FinancialSheetDrawerProps {
  conversationId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSheetCreated?: () => void;
  onEntryAdded?: (entries: FinancialEntry[]) => void;
  onEntryRemoved?: (removedEntry: FinancialEntry) => void;
}

export const FinancialSheetDrawer = ({
  conversationId,
  isOpen,
  onOpenChange,
  onSheetCreated,
  onEntryAdded,
  onEntryRemoved
}: FinancialSheetDrawerProps) => {
  const { sheet, loading, createSheet, addEntry, updateEntry, removeEntry } = useFinancialSheet(conversationId);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newEntry, setNewEntry] = useState({
    name: "",
    amount: "",
    note: "",
    due_date: ""
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedSummary, setExpandedSummary] = useState(false);

  const handleCreateSheet = async () => {
    const newSheet = await createSheet();
    if (newSheet && onSheetCreated) {
      onSheetCreated();
    }
  };

  const handleAddEntry = async () => {
    if (!newEntry.name || !newEntry.amount) return;

    const entry = await addEntry({
      name: newEntry.name,
      amount: parseFloat(newEntry.amount),
      note: newEntry.note || undefined,
      due_date: newEntry.due_date || undefined
    });

    if (entry) {
      setNewEntry({ name: "", amount: "", note: "", due_date: "" });
      setShowAddForm(false);
      if (onEntryAdded && sheet) {
        onEntryAdded([...sheet.entries, entry]);
      }
    }
  };

  const handleUpdateEntry = async (entryId: string, field: keyof FinancialEntry, value: string) => {
    const updates: Partial<FinancialEntry> = {};
    if (field === 'amount') {
      updates[field] = parseFloat(value) || 0;
    } else {
      updates[field] = value;
    }

    await updateEntry(entryId, updates);
    setEditingId(null);
  };

  const handleRemoveEntry = async (entryId: string) => {
    const removedEntry = await removeEntry(entryId);
    if (removedEntry && onEntryRemoved) {
      onEntryRemoved(removedEntry);
    }
  };

  const totalAmount = sheet?.entries.reduce((sum, entry) => sum + entry.amount, 0) || 0;

  if (loading) {
    return (
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Financial Sheet
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4 max-h-[calc(100vh-100px)] overflow-y-auto">
          {!sheet ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <DollarSign className="h-12 w-12 mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground">No financial sheet exists for this conversation.</p>
                  <Button onClick={handleCreateSheet} className="w-full">
                    Create Financial Sheet
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center justify-between">
                    Summary
                    <span className="font-mono text-lg">${totalAmount.toFixed(2)}</span>
                  </CardTitle>
                </CardHeader>
                <Collapsible open={expandedSummary} onOpenChange={setExpandedSummary}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full justify-between">
                      <span>{sheet.entries.length} entries</span>
                      <span className="text-xs">
                        {expandedSummary ? "Hide details" : "Show details"}
                      </span>
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-2">
                      <div className="space-y-2 text-sm">
                        {sheet.entries.map((entry) => (
                          <div key={entry.id} className="flex justify-between">
                            <span className="truncate">{entry.name}</span>
                            <span className="font-mono">${entry.amount.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>

              {/* Entries Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center justify-between">
                    Entries
                    <Button 
                      size="sm" 
                      onClick={() => setShowAddForm(!showAddForm)}
                      variant={showAddForm ? "outline" : "default"}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Add Entry Form */}
                  {showAddForm && (
                    <div className="space-y-3 mb-4 p-3 border rounded-lg bg-muted/50">
                      <Input
                        placeholder="Name"
                        value={newEntry.name}
                        onChange={(e) => setNewEntry(prev => ({ ...prev, name: e.target.value }))}
                      />
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Amount"
                        value={newEntry.amount}
                        onChange={(e) => setNewEntry(prev => ({ ...prev, amount: e.target.value }))}
                      />
                      <Textarea
                        placeholder="Note (optional)"
                        value={newEntry.note}
                        onChange={(e) => setNewEntry(prev => ({ ...prev, note: e.target.value }))}
                        className="resize-none"
                        rows={2}
                      />
                      <Input
                        type="date"
                        placeholder="Due date (optional)"
                        value={newEntry.due_date}
                        onChange={(e) => setNewEntry(prev => ({ ...prev, due_date: e.target.value }))}
                      />
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          onClick={handleAddEntry}
                          disabled={!newEntry.name || !newEntry.amount}
                          className="flex-1"
                        >
                          Add Entry
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => {
                            setShowAddForm(false);
                            setNewEntry({ name: "", amount: "", note: "", due_date: "" });
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Entries List */}
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {sheet.entries.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">No entries yet</p>
                    ) : (
                      sheet.entries.map((entry) => (
                        <div key={entry.id} className="border rounded-lg p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            {editingId === `${entry.id}-name` ? (
                              <Input
                                defaultValue={entry.name}
                                onBlur={(e) => handleUpdateEntry(entry.id, 'name', e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleUpdateEntry(entry.id, 'name', e.currentTarget.value);
                                  }
                                }}
                                className="text-sm h-7"
                                autoFocus
                              />
                            ) : (
                              <span 
                                className="font-medium cursor-pointer hover:bg-muted px-1 py-0.5 rounded"
                                onClick={() => setEditingId(`${entry.id}-name`)}
                              >
                                {entry.name}
                              </span>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRemoveEntry(entry.id)}
                              className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">$</span>
                            {editingId === `${entry.id}-amount` ? (
                              <Input
                                type="number"
                                step="0.01"
                                defaultValue={entry.amount}
                                onBlur={(e) => handleUpdateEntry(entry.id, 'amount', e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleUpdateEntry(entry.id, 'amount', e.currentTarget.value);
                                  }
                                }}
                                className="text-sm h-7 font-mono"
                                autoFocus
                              />
                            ) : (
                              <span 
                                className="font-mono cursor-pointer hover:bg-muted px-1 py-0.5 rounded"
                                onClick={() => setEditingId(`${entry.id}-amount`)}
                              >
                                {entry.amount.toFixed(2)}
                              </span>
                            )}
                          </div>

                          {entry.note && (
                            <div>
                              {editingId === `${entry.id}-note` ? (
                                <Textarea
                                  defaultValue={entry.note}
                                  onBlur={(e) => handleUpdateEntry(entry.id, 'note', e.target.value)}
                                  className="text-xs resize-none"
                                  rows={2}
                                  autoFocus
                                />
                              ) : (
                                <p 
                                  className="text-xs text-muted-foreground cursor-pointer hover:bg-muted px-1 py-0.5 rounded"
                                  onClick={() => setEditingId(`${entry.id}-note`)}
                                >
                                  {entry.note}
                                </p>
                              )}
                            </div>
                          )}

                          {entry.due_date && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {editingId === `${entry.id}-due_date` ? (
                                <Input
                                  type="date"
                                  defaultValue={entry.due_date}
                                  onBlur={(e) => handleUpdateEntry(entry.id, 'due_date', e.target.value)}
                                  className="text-xs h-6"
                                  autoFocus
                                />
                              ) : (
                                <span 
                                  className="cursor-pointer hover:bg-muted px-1 py-0.5 rounded"
                                  onClick={() => setEditingId(`${entry.id}-due_date`)}
                                >
                                  Due {formatDistanceToNow(new Date(entry.due_date), { addSuffix: true })}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};