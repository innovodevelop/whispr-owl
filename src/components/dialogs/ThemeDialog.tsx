import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useTheme, Theme } from "@/hooks/useTheme";

interface ThemeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ThemeDialog = ({ open, onOpenChange }: ThemeDialogProps) => {
  const { theme, setTheme } = useTheme();

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Choose Theme</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <RadioGroup value={theme} onValueChange={handleThemeChange}>
            <div className="flex items-center space-x-2 py-2">
              <RadioGroupItem value="light" id="light" />
              <Label htmlFor="light" className="flex-1 cursor-pointer">
                <div>
                  <p className="font-medium">Light</p>
                  <p className="text-sm text-muted-foreground">Use light theme</p>
                </div>
              </Label>
            </div>
            <div className="flex items-center space-x-2 py-2">
              <RadioGroupItem value="dark" id="dark" />
              <Label htmlFor="dark" className="flex-1 cursor-pointer">
                <div>
                  <p className="font-medium">Dark</p>
                  <p className="text-sm text-muted-foreground">Use dark theme</p>
                </div>
              </Label>
            </div>
            <div className="flex items-center space-x-2 py-2">
              <RadioGroupItem value="system" id="system" />
              <Label htmlFor="system" className="flex-1 cursor-pointer">
                <div>
                  <p className="font-medium">System</p>
                  <p className="text-sm text-muted-foreground">Use system preference</p>
                </div>
              </Label>
            </div>
          </RadioGroup>
        </div>
      </DialogContent>
    </Dialog>
  );
};