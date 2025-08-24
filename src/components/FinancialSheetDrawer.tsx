import { useState } from "react";
import { Plus, Trash2, Calculator, Calendar, Edit3 } from "lucide-react";
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
  sendMessage?: (content: string, burnOnReadDuration?: number, messageType?: string) => Promise<boolean>;
}

export const FinancialSheetDrawer = ({
  conversationId,
  isOpen,
  onOpenChange,
  onSheetCreated,
  onEntryAdded,
  onEntryRemoved,
  sendMessage
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
    if (newSheet && sendMessage) {
      await sendMessage("📊 Financial sheet created", undefined, "financial_notification");
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
      if (sendMessage) {
        await sendMessage(`💰 Added financial entry: ${entry.name} - $${entry.amount.toFixed(2)}`, undefined, "financial_notification");
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
    
    if (sendMessage) {
      const fieldName = field === 'due_date' ? 'due date' : field;
      await sendMessage(`✏️ Updated ${fieldName} for: ${sheet?.entries.find(e => e.id === entryId)?.name}`, undefined, "financial_notification");
    }
  };

  const handleRemoveEntry = async (entryId: string) => {
    const entryToRemove = sheet?.entries.find(e => e.id === entryId);
    const removedEntry = await removeEntry(entryId);
    if (removedEntry && onEntryRemoved) {
      onEntryRemoved(removedEntry);
    }
    if (removedEntry && sendMessage && entryToRemove) {
      await sendMessage(`🗑️ Removed financial entry: ${entryToRemove.name}`, undefined, "financial_notification");
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
            <Calculator className="h-5 w-5" />
            Financial Sheet
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4 max-h-[calc(100vh-100px)] overflow-y-auto">
          {!sheet ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <Calculator className="h-12 w-12 mx-auto text-muted-foreground" />
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
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {sheet.entries.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">No entries yet</p>
                    ) : (
                      sheet.entries.map((entry) => (
                        <div key={entry.id} className="bg-card border rounded-lg p-4 hover:shadow-sm transition-shadow">
                          {/* Header with name and actions */}
                          <div className="flex items-center justify-between mb-3 group">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              {editingId === `${entry.id}-name` ? (
                                <Input
                                  defaultValue={entry.name}
                                  onBlur={(e) => {
                                    handleUpdateEntry(entry.id, 'name', e.target.value);
                                    setEditingId(null);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleUpdateEntry(entry.id, 'name', e.currentTarget.value);
                                      setEditingId(null);
                                    }
                                    if (e.key === 'Escape') {
                                      setEditingId(null);
                                    }
                                  }}
                                  className="text-sm h-7 font-medium"
                                  autoFocus
                                />
                              ) : (
                                <div 
                                  className="flex items-center gap-1 cursor-pointer hover:bg-muted px-1 py-0.5 rounded flex-1 min-w-0"
                                  onClick={() => setEditingId(`${entry.id}-name`)}
                                >
                                  <span className="font-medium text-sm truncate">{entry.name}</span>
                                  <Edit3 className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                                </div>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRemoveEntry(entry.id)}
                              className="h-6 w-6 p-0 bg-white hover:bg-red-50 border-red-200 hover:border-red-300"
                            >
                              <Trash2 className="h-3 w-3 text-red-500" />
                            </Button>
                          </div>
                          
                          {/* Amount and due date row */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-1">
                              <Calculator className="h-3 w-3 text-muted-foreground" />
                              {editingId === `${entry.id}-amount` ? (
                                <Input
                                  type="number"
                                  step="0.01"
                                  defaultValue={entry.amount}
                                  onBlur={(e) => {
                                    handleUpdateEntry(entry.id, 'amount', e.target.value);
                                    setEditingId(null);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleUpdateEntry(entry.id, 'amount', e.currentTarget.value);
                                      setEditingId(null);
                                    }
                                    if (e.key === 'Escape') {
                                      setEditingId(null);
                                    }
                                  }}
                                  className="text-sm h-6 w-20 font-mono"
                                  autoFocus
                                />
                              ) : (
                                <div 
                                  className="font-mono text-sm cursor-pointer hover:bg-muted px-1 py-0.5 rounded group inline-flex items-center gap-1"
                                  onClick={() => setEditingId(`${entry.id}-amount`)}
                                >
                                  <span>{entry.amount.toFixed(2)}</span>
                                  <Edit3 className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                              )}
                            </div>
                            
                            {entry.due_date && (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-muted-foreground" />
                                {editingId === `${entry.id}-due_date` ? (
                                  <Input
                                    type="date"
                                    defaultValue={entry.due_date}
                                    onBlur={(e) => {
                                      handleUpdateEntry(entry.id, 'due_date', e.target.value);
                                      setEditingId(null);
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        handleUpdateEntry(entry.id, 'due_date', e.currentTarget.value);
                                        setEditingId(null);
                                      }
                                      if (e.key === 'Escape') {
                                        setEditingId(null);
                                      }
                                    }}
                                    className="text-xs h-6 w-28"
                                    autoFocus
                                  />
                                ) : (
                                  <div 
                                    className="text-xs text-muted-foreground cursor-pointer hover:bg-muted px-1 py-0.5 rounded group inline-flex items-center gap-1"
                                    onClick={() => setEditingId(`${entry.id}-due_date`)}
                                  >
                                    <span>Due {formatDistanceToNow(new Date(entry.due_date), { addSuffix: true })}</span>
                                    <Edit3 className="h-2 w-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Note */}
                          {(entry.note || editingId === `${entry.id}-note`) && (
                            <div className="mt-3">
                              {editingId === `${entry.id}-note` ? (
                                <Textarea
                                  defaultValue={entry.note || ""}
                                  onBlur={(e) => {
                                    handleUpdateEntry(entry.id, 'note', e.target.value);
                                    setEditingId(null);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && e.ctrlKey) {
                                      handleUpdateEntry(entry.id, 'note', e.currentTarget.value);
                                      setEditingId(null);
                                    }
                                    if (e.key === 'Escape') {
                                      setEditingId(null);
                                    }
                                  }}
                                  placeholder="Add a note..."
                                  className="text-xs resize-none"
                                  rows={2}
                                  autoFocus
                                />
                              ) : entry.note ? (
                                <div 
                                  className="text-xs text-muted-foreground cursor-pointer hover:bg-muted px-1 py-0.5 rounded bg-muted/30 group inline-flex items-start gap-1"
                                  onClick={() => setEditingId(`${entry.id}-note`)}
                                >
                                  <span className="flex-1">{entry.note}</span>
                                  <Edit3 className="h-2 w-2 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                                </div>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingId(`${entry.id}-note`)}
                                  className="h-6 text-xs text-muted-foreground p-1 justify-start"
                                >
                                  + Add note
                                </Button>
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