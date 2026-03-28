import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PlusCircle, Download, Trash2, Search, FileText, Upload, Loader2, Edit2, ChevronDown, ChevronUp, Tag, Filter, ArrowUpDown, Settings } from 'lucide-react';
import { Contract, SavedProfile } from '../types';
import { getContracts, deleteContract, uploadDefaultTemplate, downloadDefaultTemplate } from '../services/supabaseService';
import ContractModal from './ContractModal';

interface ContractsTabProps {
  profiles: SavedProfile[];
}

const PROJECT_COLORS = [
  'bg-blue-100 text-blue-700', 'bg-emerald-100 text-emerald-700', 'bg-purple-100 text-purple-700',
  'bg-orange-100 text-orange-700', 'bg-pink-100 text-pink-700', 'bg-teal-100 text-teal-700',
  'bg-amber-100 text-amber-700', 'bg-rose-100 text-rose-700', 'bg-cyan-100 text-cyan-700',
  'bg-indigo-100 text-indigo-700',
];
const getProjectColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return PROJECT_COLORS[Math.abs(hash) % PROJECT_COLORS.length];
};

const ContractsTab: React.FC<ContractsTabProps> = ({ profiles }) => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProject, setFilterProject] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);

  // Templates
  const [defaultContractTemplate, setDefaultContractTemplate] = useState<File | null>(null);
  const [defaultAcceptanceTemplate, setDefaultAcceptanceTemplate] = useState<File | null>(null);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [showTemplateSettings, setShowTemplateSettings] = useState(false);

  const templateUploadRef1 = React.useRef<HTMLInputElement>(null);
  const templateUploadRef2 = React.useRef<HTMLInputElement>(null);

  const loadContracts = useCallback(async () => {
    setIsLoading(true);
    try { setContracts(await getContracts()); } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  }, []);

  const loadTemplates = useCallback(async () => {
    setTemplateLoading(true);
    try {
      const [ct, at] = await Promise.all([downloadDefaultTemplate('contract'), downloadDefaultTemplate('acceptance')]);
      if (ct) setDefaultContractTemplate(ct);
      if (at) setDefaultAcceptanceTemplate(at);
    } catch (err) { console.error(err); }
    finally { setTemplateLoading(false); }
  }, []);

  useEffect(() => { loadContracts(); loadTemplates(); }, [loadContracts, loadTemplates]);

  const handleTemplateUpload = async (file: File, type: 'contract' | 'acceptance') => {
    try {
      await uploadDefaultTemplate(file, type);
      if (type === 'contract') setDefaultContractTemplate(file);
      else setDefaultAcceptanceTemplate(file);
    } catch (err: any) { alert('Lỗi upload: ' + err.message); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Xóa hợp đồng này?')) return;
    try { await deleteContract(id); setContracts(prev => prev.filter(c => c.id !== id)); } catch (err: any) { alert('Lỗi: ' + err.message); }
  };

  const handleSaved = (contract: Contract, isNew: boolean) => {
    if (isNew) setContracts(prev => [contract, ...prev]);
    else setContracts(prev => prev.map(c => c.id === contract.id ? contract : c));
  };

  const openCreate = () => { setEditingContract(null); setModalOpen(true); };
  const openEdit = (c: Contract) => { setEditingContract(c); setModalOpen(true); };

  // Derived data
  const existingProjects = useMemo(() => {
    const set = new Set(contracts.map(c => c.project_name).filter(Boolean));
    return Array.from(set).sort();
  }, [contracts]);

  const filteredContracts = useMemo(() => {
    let result = contracts.filter(c =>
      (c.profile_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.cong_viec || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.project_name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (filterProject) result = result.filter(c => c.project_name === filterProject);
    result.sort((a, b) => {
      const ta = new Date(a.created_at).getTime();
      const tb = new Date(b.created_at).getTime();
      return sortOrder === 'desc' ? tb - ta : ta - tb;
    });
    return result;
  }, [contracts, searchTerm, filterProject, sortOrder]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Contract Modal */}
      <ContractModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        contract={editingContract}
        profiles={profiles}
        existingProjects={existingProjects}
        defaultContractTemplate={defaultContractTemplate}
        defaultAcceptanceTemplate={defaultAcceptanceTemplate}
        onSaved={handleSaved}
      />

      {/* Template Management */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <button onClick={() => setShowTemplateSettings(!showTemplateSettings)} className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors rounded-xl">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-semibold text-slate-700">Quản lý mẫu mặc định</span>
            {defaultContractTemplate && defaultAcceptanceTemplate && <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">✓ Đã cấu hình</span>}
            {(!defaultContractTemplate || !defaultAcceptanceTemplate) && <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Cần upload</span>}
          </div>
          {showTemplateSettings ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>
        {showTemplateSettings && (
          <div className="px-4 pb-4 animate-fadeIn">
            <p className="text-xs text-slate-500 mb-3">Upload mẫu mặc định áp dụng cho toàn bộ hệ thống. Người dùng có thể dùng mẫu riêng khi tạo/sửa hợp đồng.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <input ref={templateUploadRef1} type="file" accept=".docx" className="hidden" onChange={(e) => e.target.files?.[0] && handleTemplateUpload(e.target.files[0], 'contract')} />
                <button onClick={() => templateUploadRef1.current?.click()} className={`w-full border-2 border-dashed rounded-lg p-4 text-sm flex items-center justify-center gap-2 transition-colors ${defaultContractTemplate ? 'border-green-300 bg-green-50 text-green-700' : 'border-slate-300 text-slate-500 hover:bg-slate-50'}`}>
                  <Upload className="w-4 h-4" /> {defaultContractTemplate ? `✓ Mẫu HĐ: ${defaultContractTemplate.name}` : 'Upload Mẫu Hợp Đồng'}
                </button>
              </div>
              <div>
                <input ref={templateUploadRef2} type="file" accept=".docx" className="hidden" onChange={(e) => e.target.files?.[0] && handleTemplateUpload(e.target.files[0], 'acceptance')} />
                <button onClick={() => templateUploadRef2.current?.click()} className={`w-full border-2 border-dashed rounded-lg p-4 text-sm flex items-center justify-center gap-2 transition-colors ${defaultAcceptanceTemplate ? 'border-green-300 bg-green-50 text-green-700' : 'border-slate-300 text-slate-500 hover:bg-slate-50'}`}>
                  <Upload className="w-4 h-4" /> {defaultAcceptanceTemplate ? `✓ Mẫu NT: ${defaultAcceptanceTemplate.name}` : 'Upload Mẫu Nghiệm Thu'}
                </button>
              </div>
            </div>
            {templateLoading && <p className="text-xs text-slate-400 mt-2 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Đang tải...</p>}
          </div>
        )}
      </div>

      {/* Contract Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Danh sách hợp đồng</h2>
              <p className="text-sm text-slate-500">{filteredContracts.length} / {contracts.length} hợp đồng</p>
            </div>
            <button onClick={openCreate} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-sm">
              <PlusCircle className="w-4 h-4" /> Tạo mới
            </button>
          </div>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" placeholder="Tìm kiếm tên, công việc, dự án..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <select value={filterProject} onChange={(e) => setFilterProject(e.target.value)}
                className="pl-9 pr-8 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer">
                <option value="">Tất cả dự án</option>
                {existingProjects.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <button onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
              className="flex items-center gap-1.5 text-sm text-slate-600 bg-slate-50 border border-slate-300 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors">
              <ArrowUpDown className="w-3.5 h-3.5" /> {sortOrder === 'desc' ? 'Mới nhất' : 'Cũ nhất'}
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[850px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Tên</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Dự án</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Thời gian</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase max-w-[200px]">Công việc</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Hình thức</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">SL</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Đơn giá</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Thành tiền</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Thực nhận</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={10} className="py-12 text-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />Đang tải...</td></tr>
              ) : filteredContracts.length === 0 ? (
                <tr><td colSpan={10} className="py-12 text-center text-slate-400"><FileText className="w-10 h-10 mx-auto mb-2 opacity-40" /><p>{contracts.length === 0 ? 'Chưa có hợp đồng nào.' : 'Không tìm thấy kết quả.'}</p></td></tr>
              ) : filteredContracts.map((c) => (
                <tr key={c.id} className="hover:bg-blue-50/30 transition-colors cursor-pointer group" onClick={() => openEdit(c)}>
                  <td className="py-3 px-4">
                    <div className="font-medium text-sm text-slate-900">{c.profile_name}</div>
                    <div className="text-[10px] text-slate-400">{new Date(c.created_at).toLocaleDateString('vi-VN')}</div>
                  </td>
                  <td className="py-3 px-4">
                    {c.project_name ? (
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${getProjectColor(c.project_name)}`}>
                        {c.project_name}
                      </span>
                    ) : <span className="text-xs text-slate-300">—</span>}
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-600">
                    <div>{c.ngay_bat_dau}/{c.thang_bat_dau} → {c.ngay_ket_thuc}/{c.thang_ket_thuc}</div>
                  </td>
                  <td className="py-3 px-4 max-w-[200px]">
                    <p className="text-xs text-slate-700 line-clamp-2">{c.cong_viec || '—'}</p>
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-600">{c.hinh_thuc || '—'}</td>
                  <td className="py-3 px-4 text-xs text-slate-600">{c.so_luong || '1'}</td>
                  <td className="py-3 px-4 text-xs text-slate-700">{c.don_gia || '—'}</td>
                  <td className="py-3 px-4 text-xs font-medium text-slate-800">{c.thanh_tien || '—'}</td>
                  <td className="py-3 px-4 text-xs font-medium text-emerald-700">{c.thuc_nhan || '—'}</td>
                  <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(c)} className="text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition-colors" title="Xem / Sửa">
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button onClick={() => handleDelete(c.id)} className="text-xs text-red-600 bg-red-50 hover:bg-red-100 px-2 py-1 rounded transition-colors" title="Xóa">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ContractsTab;
