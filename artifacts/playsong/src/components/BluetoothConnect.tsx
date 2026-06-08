import { useState } from "react";
import { Button } from "@/components/ui/button";

declare global {
  interface Navigator {
    bluetooth?: {
      requestDevice(options: { acceptAllDevices?: boolean; optionalServices?: string[] }): Promise<{ name?: string }>;
    };
  }
}

export function BluetoothConnect() {
  const [deviceName, setDeviceName] = useState<string | null>(null);

  const connect = async () => {
    if (!navigator.bluetooth) {
      alert("Bluetooth not supported on this browser.");
      return;
    }
    try {
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['battery_service']
      });
      setDeviceName(device.name || "Unknown Device");
    } catch (err) {
      console.error(err);
    }
  };

  if (!navigator.bluetooth) return null;

  return (
    <div className="bg-card border rounded-xl p-4">
      <h3 className="text-sm font-bold text-muted-foreground mb-3">Audio Output</h3>
      {deviceName ? (
        <div className="flex items-center justify-between text-secondary neon-text-secondary">
          <span>🔊 {deviceName}</span>
          <Button size="sm" variant="ghost" onClick={() => setDeviceName(null)}>Disconnect</Button>
        </div>
      ) : (
        <Button onClick={connect} variant="outline" className="w-full border-primary text-primary hover:bg-primary/10">
          Connect Bluetooth Speaker
        </Button>
      )}
    </div>
  );
}