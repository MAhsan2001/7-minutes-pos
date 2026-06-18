"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { formatDate, cn } from "@/lib/utils";
import {
  ShieldAlert,
  Search,
  Loader2,
  FileJson,
  X,
  History
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";

type AuditLog = {
  id: string;
  user_id: string;
  action: string;
  resource: string;
  resource_id: string;
  old_values: any;
  new_values: any;
  ip_address: string;
  user_agent: string;
  created_at: string;
  user?: {
    full_name: string;
    role: string;
  };
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchLogs();
  }, []);

  async function fetchLogs() {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("audit_logs")
        .select(`
          *,
          user:profiles(full_name, role)
        `)
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      setLogs(data as AuditLog[]);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
    } finally {
      setIsLoading(false);
    }
  }

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case "create": return "text-success bg-success/10";
      case "update": return "text-warning bg-warning/10";
      case "delete": return "text-destructive bg-destructive/10";
      case "void_sale": return "text-destructive bg-destructive/10 border border-destructive/20";
      case "refund": return "text-warning bg-warning/10 border border-warning/20";
      default: return "text-muted-foreground bg-muted";
    }
  };

  const filteredLogs = logs.filter(log => 
    log.resource.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.user?.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <ProtectedRoute resource="settings" action="read">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-primary" />
              Audit Logs
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Immutable ledger of system activity and security events. Admin only.
            </p>
          </div>
        </div>

        <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by user, action, or resource..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                  <th className="px-6 py-4 font-semibold">Timestamp</th>
                  <th className="px-6 py-4 font-semibold">User</th>
                  <th className="px-6 py-4 font-semibold">Action</th>
                  <th className="px-6 py-4 font-semibold">Resource</th>
                  <th className="px-6 py-4 font-semibold text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                      Loading security logs...
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                      <History className="w-8 h-8 mx-auto mb-2 opacity-20" />
                      No logs found.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 text-sm text-muted-foreground whitespace-nowrap">
                        {formatDate(log.created_at)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{log.user?.full_name || "System"}</span>
                          {log.user?.role === 'admin' && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary uppercase">Admin</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn("px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider", getActionColor(log.action))}>
                          {log.action.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-foreground capitalize">
                        {log.resource}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedLog(log);
                            setIsModalOpen(true);
                          }}
                          className="p-2 text-muted-foreground hover:bg-primary/10 hover:text-primary rounded-lg transition-colors"
                          title="View JSON Payload"
                        >
                          <FileJson className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <Dialog.Root open={isModalOpen} onOpenChange={setIsModalOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in" />
            <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-2xl bg-card border border-border rounded-2xl shadow-2xl z-50 flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95">
              
              <div className="p-5 border-b border-border flex items-center justify-between shrink-0 bg-muted/10">
                <Dialog.Title className="text-lg font-heading font-bold text-foreground flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-primary" />
                  Audit Event Details
                </Dialog.Title>
                <Dialog.Close asChild>
                  <button className="p-2 hover:bg-muted rounded-full text-muted-foreground transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </Dialog.Close>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground block mb-1 uppercase text-xs font-semibold tracking-wider">Event ID</span>
                    <span className="font-mono text-foreground break-all">{selectedLog?.id}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-1 uppercase text-xs font-semibold tracking-wider">Resource ID</span>
                    <span className="font-mono text-foreground break-all">{selectedLog?.resource_id}</span>
                  </div>
                  {selectedLog?.ip_address && (
                    <div>
                      <span className="text-muted-foreground block mb-1 uppercase text-xs font-semibold tracking-wider">IP Address</span>
                      <span className="font-mono text-foreground">{selectedLog?.ip_address}</span>
                    </div>
                  )}
                </div>

                {selectedLog?.old_values && Object.keys(selectedLog.old_values).length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Previous State</h4>
                    <pre className="bg-muted p-4 rounded-xl text-xs font-mono text-foreground overflow-x-auto border border-border">
                      {JSON.stringify(selectedLog.old_values, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedLog?.new_values && Object.keys(selectedLog.new_values).length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">New State / Payload</h4>
                    <pre className="bg-primary/5 p-4 rounded-xl text-xs font-mono text-primary overflow-x-auto border border-primary/20">
                      {JSON.stringify(selectedLog.new_values, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

      </div>
    </ProtectedRoute>
  );
}
