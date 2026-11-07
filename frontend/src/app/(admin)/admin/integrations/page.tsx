'use client';

import * as React from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Cpu,
  KeyRound,
  Layers,
  Power,
  RefreshCw,
  RotateCw,
  ShieldCheck,
  Webhook,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  configureAccountSecrets,
  disconnectIntegrationAccount,
  fetchIntegrationAccounts,
  fetchIntegrationJobs,
  retryIntegrationJob,
  simulateMockWebhook,
} from '@/lib/integrations';
import {
  IntegrationAccountDto,
  IntegrationSyncJobDto,
} from '@pinnacle/contracts';

export default function IntegrationsAdminPage() {
  const [accounts, setAccounts] = React.useState<IntegrationAccountDto[]>([]);
  const [jobs, setJobs] = React.useState<IntegrationSyncJobDto[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [actionLoading, setActionLoading] = React.useState(false);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Configure Credentials Modal State
  const [selectedProvider, setSelectedProvider] = React.useState<string | null>(null);
  const [apiKeyInput, setApiKeyInput] = React.useState('');
  const [apiSecretInput, setApiSecretInput] = React.useState('');
  const [webhookSecretInput, setWebhookSecretInput] = React.useState('');

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      const [accs, syncJobs] = await Promise.all([
        fetchIntegrationAccounts(),
        fetchIntegrationJobs(),
      ]);
      setAccounts(accs);
      setJobs(syncJobs);
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveSecrets = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProvider) return;

    try {
      setActionLoading(true);
      setErrorMsg(null);
      await configureAccountSecrets(selectedProvider, {
        credentials: {
          apiKey: apiKeyInput.trim(),
          apiSecret: apiSecretInput.trim(),
          ...(webhookSecretInput ? { webhookSecret: webhookSecretInput.trim() } : {}),
        },
      });
      setSuccessMsg(`Credentials encrypted and stored successfully for ${selectedProvider}.`);
      setSelectedProvider(null);
      setApiKeyInput('');
      setApiSecretInput('');
      setWebhookSecretInput('');
      await loadData();
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisconnect = async (provider: string) => {
    if (!confirm(`Are you sure you want to disconnect ${provider}?`)) return;

    try {
      setActionLoading(true);
      await disconnectIntegrationAccount(provider);
      setSuccessMsg(`${provider} has been disconnected.`);
      await loadData();
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRetryJob = async (jobId: string) => {
    try {
      setActionLoading(true);
      await retryIntegrationJob(jobId);
      setSuccessMsg(`Sync job ${jobId} re-dispatched for execution.`);
      await loadData();
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSimulateWebhook = async () => {
    try {
      setActionLoading(true);
      const res = await simulateMockWebhook({
        eventType: 'MOCK_ORDER_SYNC',
        externalId: `EXT-ORD-${Math.floor(1000 + Math.random() * 9000)}`,
        data: {
          itemsCount: 4,
          channel: 'MOCK_MARKETPLACE',
          totalAmount: 1120.0,
          currency: 'AUD',
        },
      });
      setSuccessMsg(`Mock webhook verified and ingested. Status: ${res.status} [Corr: ${res.correlationId}]`);
      await loadData();
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setActionLoading(false);
    }
  };

  const connectedCount = accounts.filter((a) => a.status === 'CONNECTED').length;
  const disconnectedCount = accounts.filter((a) => a.status === 'DISCONNECTED').length;
  const deadLetterCount = jobs.filter((j) => j.status === 'DEAD_LETTER').length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 font-sans">
            Channel Integrations &amp; Webhooks
          </h1>
          <p className="text-xs text-slate-500 font-sans mt-0.5">
            Provider-neutral marketplace sync, anti-loop deduplication, and encrypted credential management.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSimulateWebhook}
            disabled={actionLoading}
            className="h-8 text-xs font-medium text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100"
          >
            <Webhook className="mr-1.5 h-3.5 w-3.5 text-blue-600" />
            Test Mock Webhook
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="h-8 text-xs text-slate-600"
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Connected Channels
          </div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{connectedCount}</div>
          <div className="text-[10px] text-slate-400 mt-1">Live active synchronization</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Disconnected / Standby
          </div>
          <div className="text-2xl font-bold text-slate-700 mt-1">{disconnectedCount}</div>
          <div className="text-[10px] text-slate-400 mt-1">Foundational adapters</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Sync Jobs Logged
          </div>
          <div className="text-2xl font-bold text-blue-600 mt-1">{jobs.length}</div>
          <div className="text-[10px] text-slate-400 mt-1">Audit trail entries</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Dead-Letter Jobs
          </div>
          <div className={`text-2xl font-bold mt-1 ${deadLetterCount > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
            {deadLetterCount}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Requires manual review</div>
        </div>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 hover:underline">Dismiss</button>
        </div>
      )}

      {errorMsg && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-600 hover:underline">Dismiss</button>
        </div>
      )}

      {/* Channel Cards Grid */}
      <div>
        <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2 font-sans">
          <Layers className="h-4 w-4 text-slate-500" />
          Integration Accounts &amp; Channels
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((acc) => {
            const isConnected = acc.status === 'CONNECTED';
            const isError = acc.status === 'ERROR';

            return (
              <div
                key={acc.id}
                className={`rounded-xl border bg-white p-5 shadow-sm transition-all flex flex-col justify-between ${
                  isConnected
                    ? 'border-emerald-300 ring-1 ring-emerald-100'
                    : isError
                      ? 'border-rose-300'
                      : 'border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">{acc.name}</h3>
                      <div className="text-[11px] font-mono text-slate-400 mt-0.5">{acc.provider}</div>
                    </div>

                    <Badge
                      variant={
                        isConnected ? 'success' : isError ? 'destructive' : 'secondary'
                      }
                      className="text-[10px] uppercase font-bold"
                    >
                      {acc.status}
                    </Badge>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1">
                    {acc.capabilities.map((cap) => (
                      <span
                        key={cap}
                        className="inline-block text-[9px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded"
                      >
                        {cap.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>

                  <div className="mt-4 space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3">
                    <div className="flex justify-between">
                      <span className="text-slate-400 text-[11px]">Environment:</span>
                      <span className="font-semibold uppercase text-[11px] text-slate-700">{acc.environment}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 text-[11px]">Credentials:</span>
                      <span className="flex items-center gap-1 text-[11px]">
                        {acc.hasConfiguredSecrets ? (
                          <span className="text-emerald-600 font-semibold flex items-center gap-1">
                            <ShieldCheck className="h-3.5 w-3.5" /> Encrypted (AES-256)
                          </span>
                        ) : (
                          <span className="text-slate-400">Not configured</span>
                        )}
                      </span>
                    </div>
                    {acc.lastError && (
                      <div className="text-[11px] text-rose-600 bg-rose-50 p-2 rounded mt-2">
                        {acc.lastError}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedProvider(acc.provider);
                      setApiKeyInput('');
                      setApiSecretInput('');
                    }}
                    className="h-8 text-xs font-semibold text-slate-700"
                  >
                    <KeyRound className="mr-1.5 h-3.5 w-3.5 text-slate-500" />
                    Configure Secrets
                  </Button>

                  {isConnected ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDisconnect(acc.provider)}
                      disabled={actionLoading}
                      className="h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                    >
                      <Power className="mr-1 h-3.5 w-3.5" /> Disconnect
                    </Button>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-medium">Phase 15 Foundation</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sync Jobs & Dead-Letter Queue */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-slate-500" />
            <h2 className="text-sm font-bold text-slate-900 font-sans">
              Recent Synchronization Jobs &amp; Dead-Letter Queue
            </h2>
          </div>
          <div className="text-xs text-slate-400">Last 25 Events</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                <th className="py-2.5 px-4 font-semibold">Job ID &amp; Correlation</th>
                <th className="py-2.5 px-4 font-semibold">Provider</th>
                <th className="py-2.5 px-4 font-semibold">Direction / Type</th>
                <th className="py-2.5 px-4 font-semibold">Status</th>
                <th className="py-2.5 px-4 font-semibold">Attempts</th>
                <th className="py-2.5 px-4 font-semibold">Last Error / Notes</th>
                <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No sync jobs recorded yet. Trigger a mock webhook to see live processing.
                  </td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4">
                      <div className="font-mono text-[11px] font-semibold text-slate-900">{job.id.slice(0, 12)}...</div>
                      <div className="font-mono text-[10px] text-slate-400">{job.correlationId}</div>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800">{job.provider}</td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-700">{job.jobType}</span>
                      <span className="ml-1.5 text-[10px] font-medium text-slate-400 uppercase">({job.direction})</span>
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={
                          job.status === 'COMPLETED'
                            ? 'success'
                            : job.status === 'DEAD_LETTER'
                              ? 'destructive'
                              : job.status === 'FAILED'
                                ? 'warning'
                                : 'secondary'
                        }
                        className="text-[10px] uppercase font-bold"
                      >
                        {job.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono">
                      {job.attempts} / {job.maxAttempts}
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-[11px] text-slate-500">
                      {job.lastError || 'Completed successfully with zero error.'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {job.status === 'DEAD_LETTER' || job.status === 'FAILED' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRetryJob(job.id)}
                          disabled={actionLoading}
                          className="h-7 text-[11px] font-semibold text-blue-700 border-blue-200 hover:bg-blue-50"
                        >
                          <RotateCw className="mr-1 h-3 w-3" /> Retry Job
                        </Button>
                      ) : (
                        <span className="text-[11px] text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Configure Secrets Modal */}
      {selectedProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 font-sans">
              Configure Encrypted Secrets: {selectedProvider}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Credentials are encrypted using AES-256-GCM before database storage. They are never returned in frontend API responses.
            </p>

            <form onSubmit={handleSaveSecrets} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  API Key / Client ID <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="Enter API key or client ID"
                  required
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  API Secret / Private Token <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="password"
                  value={apiSecretInput}
                  onChange={(e) => setApiSecretInput(e.target.value)}
                  placeholder="Enter API secret or private token"
                  required
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Webhook Signing Secret (Optional)
                </label>
                <Input
                  type="password"
                  value={webhookSecretInput}
                  onChange={(e) => setWebhookSecretInput(e.target.value)}
                  placeholder="Enter webhook HMAC signature secret"
                  className="h-9 text-xs"
                />
              </div>

              <div className="mt-6 flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedProvider(null)}
                  disabled={actionLoading}
                  className="h-8 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={actionLoading}
                  className="h-8 text-xs bg-slate-900 text-white hover:bg-slate-800"
                >
                  <ShieldCheck className="mr-1.5 h-3.5 w-3.5 text-emerald-400" />
                  Encrypt &amp; Store Credentials
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

