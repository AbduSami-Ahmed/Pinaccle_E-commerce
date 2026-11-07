'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Car,
  CheckCircle2,
  AlertTriangle,
  Search,
  Trash2,
  Edit2,
  Loader2,
  Check,
} from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  deleteAdminFitment,
  fetchAdminFitments,
  updateAdminFitmentVerification,
} from '@/lib/fitment';
import { FitmentVerificationStatus, ProductFitmentDto } from '@pinnacle/contracts';

export default function AdminFitmentPage() {
  const [fitments, setFitments] = React.useState<ProductFitmentDto[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('ALL');

  // Edit Verification Dialog State
  const [editingFitment, setEditingFitment] = React.useState<ProductFitmentDto | null>(null);
  const [newStatus, setNewStatus] =
    React.useState<FitmentVerificationStatus>('VERIFIED_OEM_DIRECT');
  const [newNotes, setNewNotes] = React.useState('');
  const [submittingEdit, setSubmittingEdit] = React.useState(false);
  const [feedbackMsg, setFeedbackMsg] = React.useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Load fitments
  const loadFitments = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAdminFitments(undefined, searchTerm, statusFilter);
      setFitments(res.data);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter]);

  React.useEffect(() => {
    loadFitments();
  }, [loadFitments]);

  // Handle Edit Save
  const handleSaveVerification = async () => {
    if (!editingFitment) return;
    setSubmittingEdit(true);
    setFeedbackMsg(null);
    try {
      await updateAdminFitmentVerification('mock-token', editingFitment.id, {
        verificationStatus: newStatus,
        fitmentNotes: newNotes,
      });

      setFeedbackMsg({ type: 'success', text: `Fitment verification updated to ${newStatus}` });
      setEditingFitment(null);
      await loadFitments();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to update verification' });
    } finally {
      setSubmittingEdit(false);
    }
  };

  // Handle Delete
  const handleDeleteFitment = async (id: string) => {
    if (!confirm('Are you sure you want to remove this vehicle fitment mapping?')) return;
    try {
      await deleteAdminFitment('mock-token', id);
      setFeedbackMsg({ type: 'success', text: 'Fitment record deleted successfully' });
      await loadFitments();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to delete fitment record' });
    }
  };

  // Open Edit Dialog
  const openEditModal = (f: ProductFitmentDto) => {
    setEditingFitment(f);
    setNewStatus(f.verificationStatus);
    setNewNotes(f.fitmentNotes || '');
    setFeedbackMsg(null);
  };

  const renderStatusBadge = (status: FitmentVerificationStatus) => {
    if (status === 'VERIFIED_OEM_DIRECT') {
      return (
        <Badge
          variant="outline"
          className="border-emerald-200 bg-emerald-50 text-emerald-800 text-[11px] font-medium gap-1"
        >
          <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Verified OEM Match
        </Badge>
      );
    }
    if (status === 'UNIVERSAL_FIT') {
      return (
        <Badge
          variant="outline"
          className="border-blue-200 bg-blue-50 text-blue-800 text-[11px] font-medium gap-1"
        >
          <Check className="h-3 w-3 text-blue-600" /> Universal Fit
        </Badge>
      );
    }
    return (
      <Badge
        variant="outline"
        className="border-amber-200 bg-amber-50 text-amber-800 text-[11px] font-medium gap-1"
      >
        <AlertTriangle className="h-3 w-3 text-amber-600" /> Requires VIN Check
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/admin/dashboard">Dashboard</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Vehicle Fitment Matrix</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Car className="h-6 w-6 text-blue-700" />
            Vehicle Fitment Matrix & Verification
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Audit and verify parts compatibility against vehicle make, model, year, and chassis
            codes.
          </p>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedbackMsg && (
        <div
          className={`p-3 rounded-lg text-xs font-medium flex items-center justify-between ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <span>{feedbackMsg.text}</span>
          <button
            onClick={() => setFeedbackMsg(null)}
            className="text-slate-400 hover:text-slate-600 font-bold ml-2"
          >
            ×
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-1 items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              type="search"
              placeholder="Search by part title, SKU, or chassis code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 pl-9 text-xs"
            />
          </div>

          <div className="w-48 shrink-0">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="VERIFIED_OEM_DIRECT">Verified OEM Direct</SelectItem>
                <SelectItem value="UNIVERSAL_FIT">Universal Fit</SelectItem>
                <SelectItem value="REQUIRES_CHECK">Requires VIN Check</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <span className="text-xs text-slate-500">
          Showing <strong>{fitments.length}</strong> records
        </span>
      </div>

      {/* Fitment Table */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Catalogue Product</th>
                <th className="px-4 py-3 font-semibold">Compatible Vehicle</th>
                <th className="px-4 py-3 font-semibold">Chassis Code</th>
                <th className="px-4 py-3 font-semibold">Verification Status</th>
                <th className="px-4 py-3 font-semibold">Reviewer Notes</th>
                <th className="px-4 py-3 font-semibold">Verified By</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-700" />
                    <p className="mt-2 text-xs">Loading fitment records...</p>
                  </td>
                </tr>
              ) : fitments.length > 0 ? (
                fitments.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900 line-clamp-1">
                        {f.productTitle}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400">
                        SKU: {f.productSku}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">
                        {f.vehicleMake} {f.vehicleModel}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {f.vehicleGeneration} • {f.yearRange}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono font-medium text-slate-700">
                      {f.vehicleChassisCode}
                    </td>
                    <td className="px-4 py-3">{renderStatusBadge(f.verificationStatus)}</td>
                    <td className="px-4 py-3 text-[11px] text-slate-600 max-w-xs truncate">
                      {f.fitmentNotes || '—'}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-500">
                      <div>{f.verifiedByName || 'System / Auto'}</div>
                      {f.verifiedAt && (
                        <div className="text-[10px] text-slate-400">
                          {new Date(f.verifiedAt).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(f)}
                          className="h-8 w-8 p-0 text-slate-600 hover:text-blue-700"
                          title="Edit verification status and review notes"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteFitment(f.id)}
                          className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600"
                          title="Remove fitment record"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Car className="mx-auto h-8 w-8 text-slate-300" />
                    <p className="mt-2 text-sm font-medium text-slate-700">
                      No fitment mappings found
                    </p>
                    <p className="text-xs text-slate-500">
                      Try adjusting your search or status filter
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Edit Verification Dialog */}
      <Dialog
        open={Boolean(editingFitment)}
        onOpenChange={(open) => !open && setEditingFitment(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              Edit Fitment Verification State
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Update verification confidence level and technical notes for this vehicle fitment
              mapping.
            </DialogDescription>
          </DialogHeader>

          {editingFitment && (
            <div className="space-y-4 py-2">
              <div className="rounded-md bg-slate-50 p-3 text-xs border border-slate-200">
                <div className="font-semibold text-slate-900">{editingFitment.productTitle}</div>
                <div className="text-slate-500 text-[11px] mt-0.5">
                  Compatible with:{' '}
                  <strong>
                    {editingFitment.vehicleMake} {editingFitment.vehicleModel}
                  </strong>{' '}
                  ({editingFitment.vehicleChassisCode})
                </div>
              </div>

              {/* Status Select */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Verification Status</label>
                <Select
                  value={newStatus}
                  onValueChange={(val) => setNewStatus(val as FitmentVerificationStatus)}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VERIFIED_OEM_DIRECT">
                      VERIFIED_OEM_DIRECT — Exact OEM Interchange
                    </SelectItem>
                    <SelectItem value="UNIVERSAL_FIT">
                      UNIVERSAL_FIT — Compatible Across Standard
                    </SelectItem>
                    <SelectItem value="REQUIRES_CHECK">
                      REQUIRES_CHECK — Needs Human / VIN Inspection
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Notes Textarea */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Verification / Workshop Review Notes
                </label>
                <textarea
                  rows={3}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="e.g. Cross-checked with Toyota Parts Catalog (AXAH54 hybrid build rev 3)..."
                  className="w-full rounded-md border border-slate-300 p-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-700"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditingFitment(null)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveVerification}
              disabled={submittingEdit}
              className="text-xs bg-blue-700 hover:bg-blue-800 text-white gap-1.5"
            >
              {submittingEdit && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save Verification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
