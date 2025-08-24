-- Create financial_sheets table
CREATE TABLE public.financial_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  created_by UUID NOT NULL,
  title TEXT DEFAULT 'Financial Sheet',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create financial_entries table
CREATE TABLE public.financial_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id UUID NOT NULL REFERENCES public.financial_sheets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  note TEXT,
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.financial_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_entries ENABLE ROW LEVEL SECURITY;

-- RLS policies for financial_sheets
CREATE POLICY "Users can view sheets in their conversations" 
ON public.financial_sheets 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM conversations c 
  WHERE c.id = financial_sheets.conversation_id 
  AND (c.participant_one = auth.uid() OR c.participant_two = auth.uid())
  AND c.status = 'accepted'
));

CREATE POLICY "Users can create sheets in their conversations" 
ON public.financial_sheets 
FOR INSERT 
WITH CHECK (
  auth.uid() = created_by 
  AND EXISTS (
    SELECT 1 FROM conversations c 
    WHERE c.id = conversation_id 
    AND (c.participant_one = auth.uid() OR c.participant_two = auth.uid())
    AND c.status = 'accepted'
  )
);

CREATE POLICY "Users can update sheets in their conversations" 
ON public.financial_sheets 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM conversations c 
  WHERE c.id = financial_sheets.conversation_id 
  AND (c.participant_one = auth.uid() OR c.participant_two = auth.uid())
  AND c.status = 'accepted'
));

-- RLS policies for financial_entries
CREATE POLICY "Users can view entries in their conversation sheets" 
ON public.financial_entries 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM financial_sheets fs
  JOIN conversations c ON c.id = fs.conversation_id
  WHERE fs.id = financial_entries.sheet_id 
  AND (c.participant_one = auth.uid() OR c.participant_two = auth.uid())
  AND c.status = 'accepted'
));

CREATE POLICY "Users can create entries in their conversation sheets" 
ON public.financial_entries 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM financial_sheets fs
  JOIN conversations c ON c.id = fs.conversation_id
  WHERE fs.id = sheet_id 
  AND (c.participant_one = auth.uid() OR c.participant_two = auth.uid())
  AND c.status = 'accepted'
));

CREATE POLICY "Users can update entries in their conversation sheets" 
ON public.financial_entries 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM financial_sheets fs
  JOIN conversations c ON c.id = fs.conversation_id
  WHERE fs.id = financial_entries.sheet_id 
  AND (c.participant_one = auth.uid() OR c.participant_two = auth.uid())
  AND c.status = 'accepted'
));

CREATE POLICY "Users can delete entries in their conversation sheets" 
ON public.financial_entries 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM financial_sheets fs
  JOIN conversations c ON c.id = fs.conversation_id
  WHERE fs.id = financial_entries.sheet_id 
  AND (c.participant_one = auth.uid() OR c.participant_two = auth.uid())
  AND c.status = 'accepted'
));

-- Create triggers for updated_at
CREATE TRIGGER update_financial_sheets_updated_at
  BEFORE UPDATE ON public.financial_sheets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_financial_entries_updated_at
  BEFORE UPDATE ON public.financial_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();