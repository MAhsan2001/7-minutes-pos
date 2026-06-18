import { History } from "lucide-react";

export default function PriceHistoryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Price History</h1>
        <p className="text-sm text-muted-foreground mt-1">Track product price changes — Coming in Phase 8</p>
      </div>
      <div className="flex items-center justify-center h-[400px] rounded-xl border-2 border-dashed border-border bg-muted/30">
        <div className="text-center space-y-3">
          <History className="w-16 h-16 text-muted-foreground/30 mx-auto" />
          <p className="text-lg font-heading font-semibold text-muted-foreground">Price History</p>
          <p className="text-sm text-muted-foreground/60">Track all price changes with timestamps and users</p>
        </div>
      </div>
    </div>
  );
}
