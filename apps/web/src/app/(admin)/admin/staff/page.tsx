'use client';

import * as React from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  KeyRound,
  Mail,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  UserCheck,
  UserX,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RoleWithPermissionsDto, StaffUserDto } from '@pinnacle/contracts';
import {
  fetchPlatformRoles,
  fetchStaffMembers,
  toggleStaffActive,
  updateStaffRoles,
} from '@/lib/admin';

export default function AdminStaffPage() {
  const [staff, setStaff] = React.useState<StaffUserDto[]>([]);
  const [roles, setRoles] = React.useState<RoleWithPermissionsDto[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');

  // Role Assignment Modal state
  const [editingStaff, setEditingStaff] = React.useState<StaffUserDto | null>(null);
  const [selectedRoleIds, setSelectedRoleIds] = React.useState<string[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  // Roles Reference Tab
  const [showRolesReference, setShowRolesReference] = React.useState(false);

  const loadData = React.useCallback(async (searchTerm?: string) => {
    setLoading(true);
    try {
      const [staffData, rolesData] = await Promise.all([
        fetchStaffMembers(searchTerm),
        fetchPlatformRoles(),
      ]);
      setStaff(staffData);
      setRoles(rolesData);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData(search);
  }, [search, loadData]);

  const openRoleEditor = (user: StaffUserDto) => {
    setEditingStaff(user);
    setSelectedRoleIds(user.roles.map((r) => r.id));
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const toggleRoleId = (roleId: string) => {
    setSelectedRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId],
    );
  };

  const handleSaveRoles = async () => {
    if (!editingStaff) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      const updated = await updateStaffRoles(editingStaff.id, selectedRoleIds);
      setStaff((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      setSuccessMsg(`Successfully updated role assignments for ${updated.firstName} ${updated.lastName}`);
      setTimeout(() => {
        setEditingStaff(null);
        setSuccessMsg(null);
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update user roles');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (user: StaffUserDto) => {
    const action = user.isActive ? 'deactivate' : 'activate';
    if (!confirm(`Are you sure you want to ${action} staff account for ${user.firstName} ${user.lastName}?`)) {
      return;
    }

    try {
      const updated = await toggleStaffActive(user.id, !user.isActive);
      setStaff((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    } catch (err: any) {
      alert(err.message || `Failed to ${action} account`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Staff & RBAC Administration
            </h1>
            <Badge variant="outline" className="font-mono text-xs">
              Strict Fine-Grained RBAC
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage Prestons trade hub staff members, platform roles, and domain-level operational permissions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowRolesReference(!showRolesReference)}
            className="h-8 text-xs gap-1.5"
          >
            <KeyRound className="h-3.5 w-3.5 text-slate-600" />
            {showRolesReference ? 'Hide Role Matrix' : 'View Role Matrix'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData(search)}
            disabled={loading}
            className="h-8 text-xs gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Role Matrix Reference Drawer / Banner */}
      {showRolesReference && (
        <Card className="border-blue-200 bg-blue-50/20 shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-blue-900 flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-600" />
                Configured Platform Roles & Permissions Matrix
              </CardTitle>
              <Badge variant="outline" className="bg-white text-xs">
                {roles.length} Active System Roles
              </Badge>
            </div>
            <CardDescription className="text-xs text-blue-800/80">
              Fine-grained atomic permission codes mapped to designated automotive trade responsibilities.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-xs">
              {roles.map((r) => (
                <div key={r.id} className="p-3 bg-white rounded-lg border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{r.name}</span>
                    <Badge variant="outline" className="font-mono text-[9px]">
                      {r.key}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-500">{r.description || 'Standard role'}</p>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
                      Key Permissions ({r.permissions.length}):
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {r.permissions.slice(0, 4).map((p) => (
                        <span
                          key={p.id}
                          className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-[9px] text-slate-700"
                          title={p.description}
                        >
                          {p.code}
                        </span>
                      ))}
                      {r.permissions.length > 4 && (
                        <span className="text-[9px] text-slate-400 font-mono self-center">
                          +{r.permissions.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search staff by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 text-xs h-9 bg-slate-50"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <ShieldAlert className="h-4 w-4 text-blue-600" />
          <span>Mutations are logged to immutable audit records with actor timestamps.</span>
        </div>
      </div>

      {/* Staff Table */}
      <Card className="border-slate-200 shadow-xs">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Assigned Roles</th>
                  <th className="py-3 px-4">Account Status</th>
                  <th className="py-3 px-4">Last Activity</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {staff.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-full bg-slate-900 text-white flex items-center justify-center font-semibold text-[11px]">
                          {s.firstName[0]}
                          {s.lastName[0]}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-900 block">
                            {s.firstName} {s.lastName}
                          </span>
                          <span className="font-mono text-[10px] text-slate-500 flex items-center gap-1">
                            <Mail className="h-3 w-3 text-slate-400" />
                            {s.email}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-slate-600">
                      {s.department || 'Prestons General Operations'}
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {s.roles.length > 0 ? (
                          s.roles.map((r) => (
                            <Badge
                              key={r.id}
                              variant={r.key === 'SUPER_ADMIN' ? 'default' : 'outline'}
                              className="text-[10px]"
                            >
                              {r.name}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-slate-400 italic">No roles assigned</span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      {s.isActive ? (
                        <Badge variant="success" className="text-[10px]">
                          Active Staff
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-[10px]">
                          Deactivated
                        </Badge>
                      )}
                    </td>

                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                      {s.lastLoginAt ? new Date(s.lastLoginAt).toLocaleString('en-AU') : 'Never'}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openRoleEditor(s)}
                          className="h-7 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                        >
                          <KeyRound className="h-3.5 w-3.5 mr-1" />
                          Assign Roles
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(s)}
                          className={`h-7 text-xs ${
                            s.isActive
                              ? 'text-rose-600 hover:text-rose-800 hover:bg-rose-50'
                              : 'text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50'
                          }`}
                        >
                          {s.isActive ? (
                            <>
                              <UserX className="h-3.5 w-3.5 mr-1" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <UserCheck className="h-3.5 w-3.5 mr-1" />
                              Activate
                            </>
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Role Assignment Modal */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Assign Roles: {editingStaff.firstName} {editingStaff.lastName}
                </h2>
                <span className="text-xs text-slate-500 font-mono">{editingStaff.email}</span>
              </div>
              <button
                type="button"
                onClick={() => setEditingStaff(null)}
                className="rounded-md p-1.5 text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
                Select Roles for this User:
              </span>
              {roles.map((r) => {
                const isSelected = selectedRoleIds.includes(r.id);
                return (
                  <div
                    key={r.id}
                    onClick={() => toggleRoleId(r.id)}
                    className={`p-3 rounded-lg border text-xs cursor-pointer transition-all flex items-start justify-between ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{r.name}</span>
                        <Badge variant="outline" className="font-mono text-[9px]">
                          {r.key}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">{r.description}</p>
                    </div>

                    <div
                      className={`h-5 w-5 rounded border flex items-center justify-center shrink-0 mt-0.5 ${
                        isSelected
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check className="h-3.5 w-3.5" />}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingStaff(null)}
                disabled={saving}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveRoles}
                disabled={saving}
                className="text-xs bg-blue-600 hover:bg-blue-700"
              >
                {saving ? 'Saving...' : 'Save Role Assignments'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}