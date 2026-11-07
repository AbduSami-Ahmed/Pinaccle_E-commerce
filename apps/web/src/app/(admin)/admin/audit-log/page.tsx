'use client';

import * as React from 'react';
import {
  Code,
  Download,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { AuditLogDto } from '@pinnacle/contracts';
import { fetchAuditLogs, getExportAuditLogsUrl } from '@/lib/admin';

export default function AdminAuditLogPage() {
  const [logs, setLogs] = React.useState<AuditLogDto[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);

  // Filters
  const [domain, setDomain] = React.useState('');
  const [action, setAction] = React.useState('');
  const [selectedLog, setSelectedLog] = React.useState<AuditLogDto | null>(null);

  const loadLogs = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAuditLogs({
        domain: domain || undefined,
        action: action || undefined,
        page: 1,
        limit: 50,
      });
      setLogs(data.items);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }, [domain, action]);

  React.useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const domains = [
    { value: '', label: 'All Domains' },
    { value: 'ORDERS', label: 'Orders & Refunds' },
    { value: 'INVENTORY', label: 'Inventory & Movements' },
    { value: 'STAFF', label: 'Staff & Roles' },
    { value: 'SETTINGS', label: 'Business Settings' },
    { value: 'EXPORT', label: 'Data Exports' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Security & Audit Trail
            </h1>
            <Badge variant="outline" className="font-mono text-xs">
              Immutable Ledger
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Complete tamper-evident audit logs of sensitive order modifications, stock write-offs, role updates, and settings changes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="h-8 text-xs gap-1.5">
            <a href={getExportAuditLogsUrl()} download>
              <Download className="h-3.5 w-3.5 text-slate-600" />
              Export CSV
            </a>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={loadLogs}
            disabled={loading}
            className="h-8 text-xs gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Domain Filter Pills */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
            {domains.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => setDomain(d.value)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${domain === d.value
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                {d.label}
              </button>
            ))}
          </div>

          <div className="relative w-48">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Filter by action code..."
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="pl-8 text-xs h-8 bg-slate-50"
            />
          </div>
        </div>

        <div className="text-xs font-mono text-slate-500">
          Showing <strong>{logs.length}</strong> of <strong>{total}</strong> logged events
        </div>
      </div>

      {/* Audit Log Table */}
      <Card className="border-slate-200 shadow-xs">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Timestamp (AEST)</th>
                  <th className="py-3 px-4">Domain</th>
                  <th className="py-3 px-4">Action Code</th>
                  <th className="py-3 px-4">Entity Ref</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Client IP</th>
                  <th className="py-3 px-4 text-right">State Diff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {logs.length > 0 ? (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {new Date(log.createdAt).toLocaleString('en-AU')}
                      </td>

                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            log.domain === 'ORDERS'
                              ? 'default'
                              : log.domain === 'STAFF'
                                ? 'outline'
                                : 'warning'
                          }
                          className="text-[9px] uppercase tracking-wider"
                        >
                          {log.domain}
                        </Badge>
                      </td>

                      <td className="py-3 px-4 font-bold text-slate-900 text-xs">
                        {log.action}
                      </td>

                      <td className="py-3 px-4 text-slate-600 text-[11px]">
                        <span className="text-slate-400">{log.entityType}:</span> {log.entityId}
                      </td>

                      <td className="py-3 px-4 text-slate-800 font-sans text-xs">
                        {log.actorName || 'System'}
                      </td>

                      <td className="py-3 px-4 text-slate-400 text-[10px]">
                        {log.ipAddress || 'Internal'}
                      </td>

                      <td className="py-3 px-4 text-right font-sans">
                        {log.beforeState || log.afterState ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedLog(log)}
                            className="h-7 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                          >
                            <Code className="h-3.5 w-3.5 mr-1" />
                            View Diff
                          </Button>
                        ) : (
                          <span className="text-slate-300 text-xs italic">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500 font-sans">
                      {loading ? 'Querying immutable audit logs...' : 'No audit entries found for the selected filters.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* State Diff Inspector Drawer */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl p-6 overflow-y-auto space-y-5 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  State Mutation Diff
                </h2>
                <span className="text-xs text-slate-500 font-mono">
                  {selectedLog.domain} &bull; {selectedLog.action}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="rounded-md p-1.5 text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Metadata */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5 font-mono text-[11px]">
              <div>
                <span className="text-slate-400">Timestamp: </span>
                <span className="text-slate-800">{new Date(selectedLog.createdAt).toLocaleString('en-AU')}</span>
              </div>
              <div>
                <span className="text-slate-400">Actor: </span>
                <span className="text-slate-800">{selectedLog.actorName} ({selectedLog.actorEmail || 'N/A'})</span>
              </div>
              <div>
                <span className="text-slate-400">Target Entity: </span>
                <span className="text-slate-800">{selectedLog.entityType} ID: {selectedLog.entityId}</span>
              </div>
              <div>
                <span className="text-slate-400">User Agent: </span>
                <span className="text-slate-600 truncate block">{selectedLog.userAgent || 'N/A'}</span>
              </div>
            </div>

            {/* Before State */}
            <div>
              <span className="font-semibold text-slate-700 uppercase tracking-wider text-[11px] block mb-1">
                Before Mutation:
              </span>
              <pre className="p-3 rounded-lg bg-slate-900 text-slate-200 font-mono text-[11px] overflow-x-auto">
                {selectedLog.beforeState
                  ? JSON.stringify(selectedLog.beforeState, null, 2)
                  : '(null / initial creation)'}
              </pre>
            </div>

            {/* After State */}
            <div>
              <span className="font-semibold text-slate-700 uppercase tracking-wider text-[11px] block mb-1">
                After Mutation:
              </span>
              <pre className="p-3 rounded-lg bg-slate-900 text-emerald-400 font-mono text-[11px] overflow-x-auto">
                {selectedLog.afterState
                  ? JSON.stringify(selectedLog.afterState, null, 2)
                  : '(null / deleted)'}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}