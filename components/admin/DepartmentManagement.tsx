import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2, Plus, Pencil, Trash2, Loader2, ChevronRight,
  MapPin, X, Check, AlertCircle,
} from 'lucide-react';
import { Campus, Department } from '../../types';
import {
  getCampuses, createCampus, updateCampus, deleteCampus,
  getDepartments, createDepartment, updateDepartment, deleteDepartment,
} from '../../services/adminService';

const DepartmentManagement: React.FC = () => {
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Inline edit states
  const [editingCampusId, setEditingCampusId] = useState<string | null>(null);
  const [editingCampusName, setEditingCampusName] = useState('');
  const [editingDeptId, setEditingDeptId] = useState<string | null>(null);
  const [editingDeptName, setEditingDeptName] = useState('');
  const [editingDeptCampus, setEditingDeptCampus] = useState<string | null>(null);

  // Create new states
  const [showNewCampus, setShowNewCampus] = useState(false);
  const [newCampusName, setNewCampusName] = useState('');
  const [showNewDept, setShowNewDept] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptCampusId, setNewDeptCampusId] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const [c, d] = await Promise.all([getCampuses(), getDepartments()]);
      setCampuses(c);
      setDepartments(d);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // --- Campus CRUD ---
  const handleCreateCampus = async () => {
    if (!newCampusName.trim()) return;
    setSaving(true);
    try {
      const campus = await createCampus(newCampusName.trim());
      setCampuses(prev => [...prev, campus]);
      setNewCampusName('');
      setShowNewCampus(false);
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  const handleUpdateCampus = async (id: string) => {
    if (!editingCampusName.trim()) return;
    setSaving(true);
    try {
      await updateCampus(id, editingCampusName.trim());
      setCampuses(prev => prev.map(c => c.id === id ? { ...c, name: editingCampusName.trim() } : c));
      setEditingCampusId(null);
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  const handleDeleteCampus = async (id: string) => {
    const deptCount = departments.filter(d => d.campus_id === id).length;
    if (deptCount > 0) {
      setError(`Không thể xóa đơn vị vì còn ${deptCount} phòng ban trực thuộc.`);
      return;
    }
    if (!window.confirm('Xóa đơn vị này?')) return;
    setSaving(true);
    try {
      await deleteCampus(id);
      setCampuses(prev => prev.filter(c => c.id !== id));
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  // --- Department CRUD ---
  const handleCreateDept = async () => {
    if (!newDeptName.trim()) return;
    setSaving(true);
    try {
      const dept = await createDepartment(newDeptName.trim(), newDeptCampusId);
      setDepartments(prev => [...prev, dept]);
      setNewDeptName('');
      setNewDeptCampusId(null);
      setShowNewDept(false);
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  const handleUpdateDept = async (id: string) => {
    if (!editingDeptName.trim()) return;
    setSaving(true);
    try {
      await updateDepartment(id, editingDeptName.trim(), editingDeptCampus);
      setDepartments(prev => prev.map(d => {
        if (d.id !== id) return d;
        const campus = campuses.find(c => c.id === editingDeptCampus) || null;
        return { ...d, name: editingDeptName.trim(), campus_id: editingDeptCampus, campus: campus || undefined };
      }));
      setEditingDeptId(null);
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  const handleDeleteDept = async (id: string) => {
    if (!window.confirm('Xóa phòng ban này?')) return;
    setSaving(true);
    try {
      await deleteDepartment(id);
      setDepartments(prev => prev.filter(d => d.id !== id));
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  if (isLoading) return (
    <div className="flex justify-center py-12">
      <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
    </div>
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Campuses Section */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-orange-500" />
            <h3 className="text-sm font-semibold text-slate-800">Đơn vị / Cơ sở</h3>
            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">{campuses.length}</span>
          </div>
          <button
            onClick={() => { setShowNewCampus(true); setNewCampusName(''); }}
            className="flex items-center gap-1.5 text-xs bg-orange-50 hover:bg-orange-100 text-orange-700 px-3 py-1.5 rounded-lg transition-colors font-medium"
          >
            <Plus className="w-3.5 h-3.5" /> Thêm đơn vị
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {campuses.map(campus => (
            <div key={campus.id} className="px-4 py-3 flex items-center gap-3 bg-white hover:bg-slate-50/50 transition-colors">
              {editingCampusId === campus.id ? (
                <>
                  <input
                    value={editingCampusName}
                    onChange={e => setEditingCampusName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleUpdateCampus(campus.id); if (e.key === 'Escape') setEditingCampusId(null); }}
                    className="flex-1 text-sm border border-indigo-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-400 outline-none"
                    autoFocus
                  />
                  <button onClick={() => handleUpdateCampus(campus.id)} disabled={saving} className="text-emerald-600 hover:text-emerald-800 p-1">
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={() => setEditingCampusId(null)} className="text-slate-400 hover:text-slate-600 p-1">
                    <X className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-800">{campus.name}</p>
                    <p className="text-xs text-slate-400">{departments.filter(d => d.campus_id === campus.id).length} phòng ban</p>
                  </div>
                  <button onClick={() => { setEditingCampusId(campus.id); setEditingCampusName(campus.name); }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDeleteCampus(campus.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          ))}

          {showNewCampus && (
            <div className="px-4 py-3 flex items-center gap-3 bg-orange-50">
              <input
                value={newCampusName}
                onChange={e => setNewCampusName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreateCampus(); if (e.key === 'Escape') setShowNewCampus(false); }}
                placeholder="Tên đơn vị mới..."
                className="flex-1 text-sm border border-orange-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-orange-400 outline-none bg-white"
                autoFocus
              />
              <button onClick={handleCreateCampus} disabled={saving || !newCampusName.trim()} className="text-emerald-600 hover:text-emerald-800 p-1 disabled:opacity-40">
                <Check className="w-4 h-4" />
              </button>
              <button onClick={() => setShowNewCampus(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {campuses.length === 0 && !showNewCampus && (
            <div className="py-8 text-center text-slate-400 text-sm">
              <MapPin className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>Chưa có đơn vị nào. Hãy thêm mới!</p>
            </div>
          )}
        </div>
      </div>

      {/* Departments Section */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-500" />
            <h3 className="text-sm font-semibold text-slate-800">Phòng ban</h3>
            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{departments.length}</span>
          </div>
          <button
            onClick={() => { setShowNewDept(true); setNewDeptName(''); setNewDeptCampusId(campuses[0]?.id || null); }}
            className="flex items-center gap-1.5 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg transition-colors font-medium"
          >
            <Plus className="w-3.5 h-3.5" /> Thêm phòng ban
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {departments.map(dept => (
            <div key={dept.id} className="px-4 py-3 flex items-center gap-3 bg-white hover:bg-slate-50/50 transition-colors">
              {editingDeptId === dept.id ? (
                <>
                  <div className="flex-1 flex gap-2">
                    <input
                      value={editingDeptName}
                      onChange={e => setEditingDeptName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleUpdateDept(dept.id); if (e.key === 'Escape') setEditingDeptId(null); }}
                      className="flex-1 text-sm border border-indigo-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-400 outline-none"
                      autoFocus
                    />
                    <select
                      value={editingDeptCampus || ''}
                      onChange={e => setEditingDeptCampus(e.target.value || null)}
                      className="text-sm border border-indigo-300 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-indigo-400"
                    >
                      <option value="">Không có đơn vị</option>
                      {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <button onClick={() => handleUpdateDept(dept.id)} disabled={saving} className="text-emerald-600 hover:text-emerald-800 p-1">
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={() => setEditingDeptId(null)} className="text-slate-400 hover:text-slate-600 p-1">
                    <X className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-800">{dept.name}</p>
                    {dept.campus && <p className="text-xs text-slate-400">{dept.campus.name}</p>}
                  </div>
                  <button onClick={() => { setEditingDeptId(dept.id); setEditingDeptName(dept.name); setEditingDeptCampus(dept.campus_id); }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDeleteDept(dept.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          ))}

          {showNewDept && (
            <div className="px-4 py-3 flex items-center gap-3 bg-indigo-50">
              <div className="flex-1 flex gap-2">
                <input
                  value={newDeptName}
                  onChange={e => setNewDeptName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleCreateDept(); if (e.key === 'Escape') setShowNewDept(false); }}
                  placeholder="Tên phòng ban..."
                  className="flex-1 text-sm border border-indigo-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-400 outline-none bg-white"
                  autoFocus
                />
                <select
                  value={newDeptCampusId || ''}
                  onChange={e => setNewDeptCampusId(e.target.value || null)}
                  className="text-sm border border-indigo-300 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                >
                  <option value="">Không có đơn vị</option>
                  {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <button onClick={handleCreateDept} disabled={saving || !newDeptName.trim()} className="text-emerald-600 hover:text-emerald-800 p-1 disabled:opacity-40">
                <Check className="w-4 h-4" />
              </button>
              <button onClick={() => setShowNewDept(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {departments.length === 0 && !showNewDept && (
            <div className="py-8 text-center text-slate-400 text-sm">
              <Building2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>Chưa có phòng ban nào.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DepartmentManagement;
