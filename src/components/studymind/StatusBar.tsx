import { Signal, Wifi, BatteryFull } from "lucide-react";

export const StatusBar = () => (
  <div className="flex items-center justify-between px-6 pt-3 pb-1 text-xs font-semibold text-foreground">
    <span>9:41</span>
    <div className="flex items-center gap-1.5">
      <Signal className="h-3 w-3" />
      <Wifi className="h-3 w-3" />
      <BatteryFull className="h-3.5 w-3.5" />
    </div>
  </div>
);
