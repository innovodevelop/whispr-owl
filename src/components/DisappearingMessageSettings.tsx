import { useState } from "react";
import { Clock, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUserSettings } from "@/hooks/useUserSettings";
import { toast } from "@/hooks/use-toast";

export const DisappearingMessageSettings = () => {
  const { settings, updateSetting } = useUserSettings();
  const [customValue, setCustomValue] = useState("");
  const [customUnit, setCustomUnit] = useState("minutes");
  const [selectedOption, setSelectedOption] = useState(
    settings?.disappearing_message_duration ? 
      (settings.disappearing_message_duration.toString()) : 
      "never"
  );

  const presetOptions = [
    { value: "30", label: "30 minutes", minutes: 30 },
    { value: "60", label: "1 hour", minutes: 60 },
    { value: "120", label: "2 hours", minutes: 120 },
    { value: "360", label: "6 hours", minutes: 360 },
    { value: "1440", label: "1 day", minutes: 1440 },
    { value: "2880", label: "2 days", minutes: 2880 },
    { value: "never", label: "Do not disappear", minutes: null },
  ];

  const calculateCustomMinutes = () => {
    const value = parseInt(customValue);
    if (!value || value <= 0) return null;
    
    switch (customUnit) {
      case "seconds": return Math.max(1, Math.floor(value / 60));
      case "minutes": return value;
      case "hours": return value * 60;
      case "days": return value * 1440;
      default: return value;
    }
  };

  const handleSave = async () => {
    let durationMinutes = null;
    
    if (selectedOption === "custom") {
      durationMinutes = calculateCustomMinutes();
      if (!durationMinutes) {
        toast({
          title: "Invalid custom time",
          description: "Please enter a valid time duration.",
          variant: "destructive"
        });
        return;
      }
    } else if (selectedOption !== "never") {
      const preset = presetOptions.find(opt => opt.value === selectedOption);
      durationMinutes = preset?.minutes || null;
    }

    const success = await updateSetting('disappearing_message_duration', durationMinutes);
    
    if (success) {
      toast({
        title: "Settings saved",
        description: "Disappearing message settings have been updated.",
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Disappearing Messages
        </CardTitle>
        <CardDescription>
          Choose when your messages should automatically disappear after being read
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <RadioGroup value={selectedOption} onValueChange={setSelectedOption}>
          {presetOptions.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <RadioGroupItem value={option.value} id={option.value} />
              <Label htmlFor={option.value} className="flex-1 cursor-pointer">
                {option.label}
              </Label>
            </div>
          ))}
          
          {/* Custom Option */}
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="custom" id="custom" />
            <Label htmlFor="custom" className="cursor-pointer">Custom:</Label>
            <div className="flex items-center gap-2 flex-1">
              <Input
                type="number"
                placeholder="0"
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                disabled={selectedOption !== "custom"}
                className="w-20 h-8"
                min="1"
              />
              <Select 
                value={customUnit} 
                onValueChange={setCustomUnit}
                disabled={selectedOption !== "custom"}
              >
                <SelectTrigger className="w-24 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="seconds">Seconds</SelectItem>
                  <SelectItem value="minutes">Minutes</SelectItem>
                  <SelectItem value="hours">Hours</SelectItem>
                  <SelectItem value="days">Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </RadioGroup>

        <div className="flex gap-2 pt-4">
          <Button onClick={handleSave} className="flex-1">
            <Check className="h-4 w-4 mr-2" />
            Save Settings
          </Button>
        </div>

        {settings?.disappearing_message_duration && (
          <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
            <p className="font-medium mb-1">Current setting:</p>
            <p>
              Messages disappear after{" "}
              {settings.disappearing_message_duration < 60 
                ? `${settings.disappearing_message_duration} minutes`
                : settings.disappearing_message_duration < 1440
                  ? `${Math.floor(settings.disappearing_message_duration / 60)} hours`
                  : `${Math.floor(settings.disappearing_message_duration / 1440)} days`
              }
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};