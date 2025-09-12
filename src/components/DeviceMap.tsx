import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { MapPin } from 'lucide-react';

interface Device {
  id: string;
  device_name: string;
  location_permission: boolean;
  last_used_at: string;
}

interface DeviceMapProps {
  devices: Device[];
}

export const DeviceMap = ({ devices }: DeviceMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [mapboxToken, setMapboxToken] = useState<string>('');
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [tempToken, setTempToken] = useState('');

  const initializeMap = () => {
    if (!mapboxToken || !mapContainer.current) return;

    // For now, show a placeholder map since we need proper Mapbox integration
    const container = mapContainer.current;
    container.innerHTML = `
      <div class="w-full h-full bg-muted rounded-lg flex items-center justify-center flex-col gap-4">
        <div class="text-center">
          <div class="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
          </div>
          <h3 class="font-medium text-foreground">Encrypted Location Map</h3>
          <p class="text-sm text-muted-foreground mt-1">
            ${devices.filter(d => d.location_permission).length} devices with location enabled
          </p>
        </div>
        
        <div class="grid grid-cols-1 gap-2 w-full max-w-xs">
          ${devices.filter(d => d.location_permission).map(device => `
            <div class="bg-card p-2 rounded border flex items-center gap-2">
              <div class="w-2 h-2 bg-green-500 rounded-full"></div>
              <span class="text-sm font-medium">${device.device_name || 'Device'}</span>
            </div>
          `).join('')}
        </div>
        
        ${devices.filter(d => d.location_permission).length === 0 ? `
          <p class="text-sm text-muted-foreground">No devices have location sharing enabled</p>
        ` : ''}
      </div>
    `;
  };

  useEffect(() => {
    initializeMap();
  }, [mapboxToken, devices]);

  const handleTokenSubmit = () => {
    if (tempToken.trim()) {
      setMapboxToken(tempToken.trim());
      setShowTokenInput(false);
      setTempToken('');
    }
  };

  if (!mapboxToken) {
    return (
      <div className="w-full h-64 bg-muted rounded-lg flex items-center justify-center flex-col gap-4">
        <MapPin className="h-12 w-12 text-muted-foreground" />
        <div className="text-center">
          <h3 className="font-medium mb-2">Map Configuration Required</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Enter your Mapbox public token to view device locations
          </p>
          
          {!showTokenInput ? (
            <Button onClick={() => setShowTokenInput(true)} variant="outline">
              Configure Map
            </Button>
          ) : (
            <div className="space-y-2">
              <input
                type="text"
                placeholder="pk.eyJ1IjoieW91ci1tYXBib3gtdG9rZW4i..."
                value={tempToken}
                onChange={(e) => setTempToken(e.target.value)}
                className="w-full max-w-sm px-3 py-2 border border-border rounded-md text-sm"
              />
              <div className="flex gap-2 justify-center">
                <Button size="sm" onClick={handleTokenSubmit}>
                  Save Token
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowTokenInput(false)}>
                  Cancel
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Get your token at{' '}
                <a href="https://mapbox.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  mapbox.com
                </a>
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={mapContainer} 
      className="w-full h-64 rounded-lg border border-border overflow-hidden"
    />
  );
};