import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { RotateCcw, Plus, X, Clock, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface AutoDisplayNameConfig {
  id?: string;
  enabled: boolean;
  interval_type: 'hourly' | 'daily' | 'weekly';
  last_rotation: string | null;
  next_rotation: string | null;
  name_pool: string[];
  current_name_index: number;
}

export const AutoDisplayNameSettings = () => {
  const { user } = useAuth();
  const [config, setConfig] = useState<AutoDisplayNameConfig>({
    enabled: false,
    interval_type: 'daily',
    last_rotation: null,
    next_rotation: null,
    name_pool: [],
    current_name_index: 0
  });
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchConfig();
    }
  }, [user]);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('auto_display_names')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setConfig({
          id: data.id,
          enabled: data.enabled,
          interval_type: data.interval_type as 'hourly' | 'daily' | 'weekly',
          last_rotation: data.last_rotation,
          next_rotation: data.next_rotation,
          name_pool: (data.name_pool as string[]) || [],
          current_name_index: data.current_name_index
        });
      }
    } catch (error) {
      console.error('Error fetching auto display name config:', error);
      toast.error('Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async (updatedConfig: AutoDisplayNameConfig) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('auto_display_names')
        .upsert({
          user_id: user?.id,
          enabled: updatedConfig.enabled,
          interval_type: updatedConfig.interval_type,
          name_pool: updatedConfig.name_pool,
          current_name_index: updatedConfig.current_name_index,
          updated_at: new Date().toISOString(),
          ...(updatedConfig.id && { id: updatedConfig.id })
        });

      if (error) throw error;

      await fetchConfig();
      toast.success('Configuration saved successfully');
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const addName = () => {
    if (newName.trim() && !config.name_pool.includes(newName.trim())) {
      const updatedConfig = {
        ...config,
        name_pool: [...config.name_pool, newName.trim()]
      };
      setConfig(updatedConfig);
      setNewName('');
      saveConfig(updatedConfig);
    }
  };

  const removeName = (nameToRemove: string) => {
    const updatedConfig = {
      ...config,
      name_pool: config.name_pool.filter(name => name !== nameToRemove)
    };
    setConfig(updatedConfig);
    saveConfig(updatedConfig);
  };

  const toggleEnabled = (enabled: boolean) => {
    const updatedConfig = { ...config, enabled };
    setConfig(updatedConfig);
    saveConfig(updatedConfig);
  };

  const updateInterval = (interval_type: 'hourly' | 'daily' | 'weekly') => {
    const updatedConfig = { ...config, interval_type };
    setConfig(updatedConfig);
    saveConfig(updatedConfig);
  };

  const forceRotation = async () => {
    try {
      const { error } = await supabase.functions.invoke('rotate-display-name', {
        body: { userId: user?.id, force: true }
      });

      if (error) throw error;

      await fetchConfig();
      toast.success('Display name rotated successfully');
    } catch (error) {
      console.error('Error rotating display name:', error);
      toast.error('Failed to rotate display name');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Auto Display Name Changes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Auto Display Name Changes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="auto-display-names">Enable Auto Display Name Changes</Label>
            <p className="text-sm text-muted-foreground">
              Automatically rotate your display name at set intervals for privacy
            </p>
          </div>
          <Switch
            id="auto-display-names"
            checked={config.enabled}
            onCheckedChange={toggleEnabled}
            disabled={saving}
          />
        </div>

        {config.enabled && (
          <>
            {/* Interval Selection */}
            <div className="space-y-2">
              <Label>Rotation Interval</Label>
              <Select value={config.interval_type} onValueChange={updateInterval}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Every Hour</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Rotation Status */}
            {config.last_rotation && (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  Last rotation: {formatDistanceToNow(new Date(config.last_rotation), { addSuffix: true })}
                </span>
                {config.next_rotation && (
                  <Badge variant="outline" className="ml-auto">
                    Next: {formatDistanceToNow(new Date(config.next_rotation), { addSuffix: true })}
                  </Badge>
                )}
              </div>
            )}

            {/* Name Pool */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Display Name Pool ({config.name_pool.length})</Label>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={forceRotation}
                  disabled={config.name_pool.length === 0}
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Rotate Now
                </Button>
              </div>

              {/* Add new name */}
              <div className="flex gap-2">
                <Input
                  placeholder="Enter a display name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addName()}
                />
                <Button size="sm" onClick={addName} disabled={!newName.trim()}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>

              {/* Name list */}
              <div className="space-y-2">
                {config.name_pool.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Add display names to enable automatic rotation
                  </p>
                ) : (
                  <div className="grid gap-2">
                    {config.name_pool.map((name, index) => (
                      <div 
                        key={name} 
                        className="flex items-center justify-between p-2 bg-muted rounded border"
                      >
                        <span className="font-medium">
                          {name}
                          {index === config.current_name_index && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              Current
                            </Badge>
                          )}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeName(name)}
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};