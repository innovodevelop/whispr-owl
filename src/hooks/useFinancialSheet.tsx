import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";

export interface FinancialEntry {
  id: string;
  name: string;
  amount: number;
  note?: string;
  due_date?: string;
}

export interface FinancialSheet {
  id: string;
  conversation_id: string;
  created_by: string;
  title: string;
  entries: FinancialEntry[];
}

export const useFinancialSheet = (conversationId: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sheet, setSheet] = useState<FinancialSheet | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSheet = async () => {
    if (!user || !conversationId) return;

    try {
      const { data: sheetData, error: sheetError } = await supabase
        .from("financial_sheets")
        .select("*")
        .eq("conversation_id", conversationId)
        .single();

      if (sheetError && sheetError.code !== "PGRST116") {
        throw sheetError;
      }

      if (sheetData) {
        const { data: entriesData, error: entriesError } = await supabase
          .from("financial_entries")
          .select("*")
          .eq("sheet_id", sheetData.id)
          .order("created_at", { ascending: true });

        if (entriesError) throw entriesError;

        setSheet({
          ...sheetData,
          entries: entriesData || []
        });
      }
    } catch (error) {
      console.error("Error fetching financial sheet:", error);
      toast({
        title: "Error",
        description: "Failed to load financial sheet",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createSheet = async () => {
    if (!user || !conversationId) return null;

    try {
      const { data, error } = await supabase
        .from("financial_sheets")
        .insert({
          conversation_id: conversationId,
          created_by: user.id,
          title: "Financial Sheet"
        })
        .select()
        .single();

      if (error) throw error;

      const newSheet = { ...data, entries: [] };
      setSheet(newSheet);
      return newSheet;
    } catch (error) {
      console.error("Error creating financial sheet:", error);
      toast({
        title: "Error",
        description: "Failed to create financial sheet",
        variant: "destructive",
      });
      return null;
    }
  };

  const addEntry = async (entry: Omit<FinancialEntry, "id">) => {
    if (!sheet) return;

    try {
      const { data, error } = await supabase
        .from("financial_entries")
        .insert({
          sheet_id: sheet.id,
          name: entry.name,
          amount: entry.amount,
          note: entry.note,
          due_date: entry.due_date
        })
        .select()
        .single();

      if (error) throw error;

      setSheet(prev => prev ? {
        ...prev,
        entries: [...prev.entries, data]
      } : null);

      return data;
    } catch (error) {
      console.error("Error adding entry:", error);
      toast({
        title: "Error",
        description: "Failed to add entry",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateEntry = async (entryId: string, updates: Partial<FinancialEntry>) => {
    if (!sheet) return;

    try {
      const { data, error } = await supabase
        .from("financial_entries")
        .update(updates)
        .eq("id", entryId)
        .select()
        .single();

      if (error) throw error;

      setSheet(prev => prev ? {
        ...prev,
        entries: prev.entries.map(entry => 
          entry.id === entryId ? { ...entry, ...data } : entry
        )
      } : null);

      return data;
    } catch (error) {
      console.error("Error updating entry:", error);
      toast({
        title: "Error",
        description: "Failed to update entry",
        variant: "destructive",
      });
      return null;
    }
  };

  const removeEntry = async (entryId: string) => {
    if (!sheet) return null;

    const entryToRemove = sheet.entries.find(e => e.id === entryId);
    if (!entryToRemove) return null;

    try {
      const { error } = await supabase
        .from("financial_entries")
        .delete()
        .eq("id", entryId);

      if (error) throw error;

      setSheet(prev => prev ? {
        ...prev,
        entries: prev.entries.filter(entry => entry.id !== entryId)
      } : null);

      return entryToRemove;
    } catch (error) {
      console.error("Error removing entry:", error);
      toast({
        title: "Error",
        description: "Failed to remove entry",
        variant: "destructive",
      });
      return null;
    }
  };

  useEffect(() => {
    fetchSheet();
  }, [conversationId, user?.id]);

  return {
    sheet,
    loading,
    createSheet,
    addEntry,
    updateEntry,
    removeEntry,
    refetch: fetchSheet
  };
};