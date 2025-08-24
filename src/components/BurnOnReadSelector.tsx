import { useState } from "react";
import { Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BurnOnReadOption {
  label: string;
  seconds: number;
}

const burnOptions: BurnOnReadOption[] = [
  { label: "10s", seconds: 10 },
  { label: "30s", seconds: 30 },
  { label: "1min", seconds: 60 },
  { label: "5min", seconds: 300 },
  { label: "10min", seconds: 600 },
];

interface BurnOnReadSelectorProps {
  onSelect: (seconds: number | null) => void;
  selectedDuration: number | null;
}

export const BurnOnReadSelector = ({ onSelect, selectedDuration }: BurnOnReadSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (seconds: number) => {
    onSelect(seconds);
    setIsOpen(false);
  };

  const clearSelection = () => {
    onSelect(null);
    setIsOpen(false);
  };

  const selectedOption = burnOptions.find(option => option.seconds === selectedDuration);

  return (
    <div className="relative">
      {/* Flame Icon Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "h-10 w-10 shrink-0 transition-colors",
          selectedDuration ? "text-orange-500 hover:text-orange-600" : "text-muted-foreground hover:text-foreground"
        )}
        aria-label="Burn on read settings"
        title={selectedDuration ? `Burn after ${selectedOption?.label}` : "Set burn on read timer"}
      >
        <Flame className="h-4 w-4" />
      </Button>

      {/* Dropup Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Options Panel */}
          <div className="absolute bottom-full left-0 z-50 mb-2 bg-popover border border-border rounded-lg shadow-lg p-2 min-w-[200px] animate-in slide-in-from-bottom-2">
            <div className="text-xs font-medium text-muted-foreground mb-2 px-2">
              Burn on Read
            </div>
            
            <div className="flex flex-wrap gap-1">
              {burnOptions.map((option) => (
                <Button
                  key={option.seconds}
                  variant={selectedDuration === option.seconds ? "default" : "ghost"}
                  size="sm"
                  onClick={() => handleSelect(option.seconds)}
                  className="h-8 px-3 text-xs"
                >
                  {option.label}
                </Button>
              ))}
              
              {selectedDuration && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSelection}
                  className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear
                </Button>
              )}
            </div>
            
            <div className="text-xs text-muted-foreground mt-2 px-2">
              Message will be deleted when read
            </div>
          </div>
        </>
      )}
    </div>
  );
};