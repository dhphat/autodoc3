import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Download, Loader2, Upload, FileText, Tag, Search, ChevronDown } from 'lucide-react';
import { Contract, SavedProfile } from '../types';
import { createContract, updateContract } from '../services/supabaseService';
import { generateDocument } from '../services/docxService';
import { numberToVietnameseText } from '../utils/numberToText';

interface ContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: Contract | null;
  profiles: SavedProfile[];
  existingProjects: string[];
  defaultContractTemplate: File | null;
  defaultAcceptanceTemplate: File | null;
  onSaved: (contract: Contract, isNew: boolean) => void;
}

const emptyForm = {
  profile_id: '', project_name: '',
  ngay_bat_dau: '', thang_bat_dau: '', ngay_ket_thuc: '', thang_ket_thuc: '',
  cong_viec: '', cong_viec_cu_the: '', hinh_thuc: 'Online', yeu_cau: '',
  so_luong: '1', don_gia: '',
  thanh_tien: '', bang_chu_thanh_tien: '', thuc_nhan: '', bang_chu_thuc_nhan: '',
};

const ContractModal: React.FC<ContractModalProps> = ({
  isOpen, onClose, contract, profiles, existingProjects,
  defaultContractTemplate, defaultAcceptanceTemplate, onSaved,
}) => {
  const [form, setForm] = useState(emptyForm);
  const [useCustomTemplate, setUseCustomTemplate] = useState(false);
  const [customContractFile, setCustomContractFile] = useState<File | null>(null);
  const [customAcceptanceFile, setCustomAcceptanceFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);

  const customContractRef = useRef<HTMLInputElement>(null);
  const customAcceptanceRef = useRef<HTMLInputElement>(null);

  // Searchable profile selector
  const [profileSearch, setProfileSearch] = useState('');
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  const isEdit = !!contract;

  useEffect(() => {
    if (isOpen) {
      if (contract) {
        setForm({
          profile_id: contract.profile_id,
          project_name: contract.project_name || '',
          ngay_bat_dau: contract.ngay_bat_dau, thang_bat_dau: contract.thang_bat_dau,
          ngay_ket_thuc: contract.ngay_ket_thuc, thang_ket_thuc: contract.thang_ket_thuc,
          cong_viec: contract.cong_viec, cong_viec_cu_the: contract.cong_viec_cu_the || '',
          hinh_thuc: contract.hinh_thuc, yeu_cau: contract.yeu_cau,
          so_luong: contract.so_luong, don_gia: contract.don_gia,
          thanh_tien: contract.thanh_tien, bang_chu_thanh_tien: contract.bang_chu_thanh_tien,
          thuc_nhan: contract.thuc_nhan, bang_chu_thuc_nhan: contract.bang_chu_thuc_nhan,
        });
      } else {
        setForm({ ...emptyForm });
      }
      setUseCustomTemplate(false);
      setCustomContractFile(null);
      setCustomAcceptanceFile(null);
      setProfileSearch('');
      setShowProfileDropdown(false);
    }
  }, [isOpen, contract]);

  // Close profile dropdown on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target as Node)) {
        setShowProfileDropdown(false);
        setProfileSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Auto-calc financials
  const parseMoney = (val: string) => parseFloat(val.replace(/[\.,\s]/g, ''));
  const formatCurrency = (num: number) => Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  useEffect(() => {
    const s = parseMoney(form.so_luong);
    const d = parseMoney(form.don_gia);
    if (!isNaN(s) && !isNaN(d) && d > 0) {
      const tt = s * d;
      const tn = tt * 0.9;
      const newTT = formatCurrency(tt);
      const newTN = formatCurrency(tn);
      if (form.thanh_tien !== newTT || form.thuc_nhan !== newTN) {
        setForm(prev => ({
          ...prev,
          thanh_tien: newTT,
          bang_chu_thanh_tien: numberToVietnameseText(Math.round(tt)),
          thuc_nhan: newTN,
          bang_chu_thuc_nhan: numberToVietnameseText(Math.round(tn)),
        }));
      }
    }
  }, [form.so_luong, form.don_gia]);

  const updateField = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    if (!form.profile_id) { alert('Vui lòng chọn cá nhân'); return; }
    setIsSaving(true);
    try {
      if (isEdit && contract) {
        await updateContract(contract.id, form);
        const profile = profiles.find(p => p.id === form.profile_id);
        onSaved({ ...contract, ...form, profile_name: profile?.name || contract.profile_name, profile_data: profile?.data || contract.profile_data }, false);
      } else {
        const created = await createContract(form);
        onSaved(created, true);
      }
      onClose();
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = async (type: 'contract' | 'acceptance') => {
    let template: File | null = null;
    if (useCustomTemplate) {
      template = type === 'contract' ? customContractFile : customAcceptanceFile;
    }
    if (!template) {
      template = type === 'contract' ? defaultContractTemplate : defaultAcceptanceTemplate;
    }
    if (!template) {
      alert(`Chưa có mẫu ${type === 'contract' ? 'hợp đồng' : 'nghiệm thu'}.`);
      return;
    }

    setIsDownloading(type);
    try {
      const profile = profiles.find(p => p.id === form.profile_id);
      const profileData = profile?.data || contract?.profile_data || {};
      const data: Record<string, string> = { ...profileData, ...form };

      const images: Record<string, ArrayBuffer | null> = {};
      if (profile?.id_card_front_url) {
        try { const r = await fetch(profile.id_card_front_url); images['cccd_truoc'] = await r.arrayBuffer(); } catch {}
      }
      if (profile?.id_card_back_url) {
        try { const r = await fetch(profile.id_card_back_url); images['cccd_sau'] = await r.arrayBuffer(); } catch {}
      }
      if (profile?.id_card_portrait_url) {
        try { const r = await fetch(profile.id_card_portrait_url); images['vneid'] = await r.arrayBuffer(); } catch {}
      }

      const name = profile?.name || contract?.profile_name || 'Moi';
      const fileName = type === 'contract' ? `HopDong_${name}.docx` : `NghiemThu_${name}.docx`;
      await generateDocument({ file: template, data, fileName, images });
    } catch (err: any) {
      console.error('Download error:', err);
      alert(`Lỗi tải ${type === 'contract' ? 'hợp đồng' : 'nghiệm thu'}: ${err.message || err}`);
    } finally {
      setIsDownloading(null);
    }
  };

  if (!isOpen) return null;

  const inputCls = "w-full border border-slate-300 bg-slate-50 rounded-md px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all";
  const labelCls = "text-xs font-semibold text-slate-500 uppercase tracking-wider";
  const readOnlyCls = "w-full border border-slate-200 bg-slate-100 rounded-md px-3 py-2 text-sm text-slate-700 outline-none";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            {isEdit ? 'Chi tiết Hợp Đồng' : 'Tạo Hợp Đồng Mới'}
          </h3>
          <button onClick={onClose} disabled={isSaving} className="text-slate-400 hover:text-slate-600 disabled:opacity-50"><X className="w-5 h-5" /></button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Profile + Project */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative" ref={profileDropdownRef}>
              <label className={labelCls}>Chọn cá nhân *</label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={profileSearch || (form.profile_id ? profiles.find(p => p.id === form.profile_id)?.name || '' : '')}
                  onChange={(e) => { setProfileSearch(e.target.value); setShowProfileDropdown(true); if (!e.target.value) updateField('profile_id', ''); }}
                  onFocus={() => { setShowProfileDropdown(true); setProfileSearch(''); }}
                  placeholder="Tìm hoặc chọn hồ sơ..."
                  className={`${inputCls} pl-9 pr-8`}
                />
                <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none transition-transform ${showProfileDropdown ? 'rotate-180' : ''}`} />
              </div>
              {showProfileDropdown && (
                <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto animate-fadeIn">
                  {profiles
                    .filter(p => !profileSearch || p.name.toLowerCase().includes(profileSearch.toLowerCase()) || (p.data?.['ho_ten'] || '').toLowerCase().includes(profileSearch.toLowerCase()))
                    .map(p => (
                      <button key={p.id} type="button"
                        onClick={() => { updateField('profile_id', p.id); setProfileSearch(''); setShowProfileDropdown(false); }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors flex items-center justify-between ${form.profile_id === p.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700'}`}>
                        <span>{p.name}</span>
                        {p.data?.['dien_thoai'] && <span className="text-[10px] text-slate-400">{p.data['dien_thoai']}</span>}
                      </button>
                    ))}
                  {profiles.filter(p => !profileSearch || p.name.toLowerCase().includes(profileSearch.toLowerCase())).length === 0 && (
                    <div className="px-3 py-3 text-sm text-slate-400 text-center">Không tìm thấy</div>
                  )}
                </div>
              )}
            </div>
            <div>
              <label className={labelCls}>Tên dự án (Tag)</label>
              <div className="relative mt-1">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input value={form.project_name} onChange={(e) => updateField('project_name', e.target.value)} list="project-suggestions" placeholder="VD: Color Up 2024" className={`${inputCls} pl-9`} />
                <datalist id="project-suggestions">{existingProjects.map(p => <option key={p} value={p} />)}</datalist>
              </div>
            </div>
          </div>

          {/* Time */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase mb-2 border-l-4 border-blue-500 pl-2">Thời gian</h4>
            <div className="grid grid-cols-4 gap-3">
              <div><label className={labelCls}>Ngày Bắt đầu</label><input value={form.ngay_bat_dau} onChange={(e) => updateField('ngay_bat_dau', e.target.value)} placeholder="DD" className={`${inputCls} mt-1`} /></div>
              <div><label className={labelCls}>Tháng Bắt đầu</label><input value={form.thang_bat_dau} onChange={(e) => updateField('thang_bat_dau', e.target.value)} placeholder="MM" className={`${inputCls} mt-1`} /></div>
              <div><label className={labelCls}>Ngày Kết thúc</label><input value={form.ngay_ket_thuc} onChange={(e) => updateField('ngay_ket_thuc', e.target.value)} placeholder="DD" className={`${inputCls} mt-1`} /></div>
              <div><label className={labelCls}>Tháng Kết thúc</label><input value={form.thang_ket_thuc} onChange={(e) => updateField('thang_ket_thuc', e.target.value)} placeholder="MM" className={`${inputCls} mt-1`} /></div>
            </div>
          </div>

          {/* Job */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase mb-2 border-l-4 border-blue-500 pl-2">Thông tin Công việc</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Công việc <span className="font-normal normal-case text-slate-400">{'{cong_viec}'}</span></label>
                <input value={form.cong_viec} onChange={(e) => updateField('cong_viec', e.target.value)} placeholder="VD: Dựng video recap, visual..." className={`${inputCls} mt-1`} />
              </div>
              <div>
                <label className={labelCls}>Hình thức <span className="font-normal normal-case text-slate-400">{'{hinh_thuc}'}</span></label>
                <input value={form.hinh_thuc} onChange={(e) => updateField('hinh_thuc', e.target.value)} className={`${inputCls} mt-1`} />
              </div>
            </div>
            <div className="mt-3">
              <label className={labelCls}>Công việc cụ thể <span className="font-normal normal-case text-slate-400">{'{cong_viec_cu_the}'}</span></label>
              <textarea value={form.cong_viec_cu_the} onChange={(e) => updateField('cong_viec_cu_the', e.target.value)} rows={3} className={`${inputCls} mt-1 resize-y min-h-[80px]`} placeholder="Mô tả chi tiết nhiệm vụ..." />
            </div>
            <div className="mt-3">
              <label className={labelCls}>Yêu cầu <span className="font-normal normal-case text-slate-400">{'{yeu_cau}'}</span></label>
              <textarea value={form.yeu_cau} onChange={(e) => updateField('yeu_cau', e.target.value)} rows={3} className={`${inputCls} mt-1 resize-y min-h-[80px]`} placeholder="Yêu cầu chi tiết..." />
            </div>
          </div>

          {/* Financial */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase mb-2 border-l-4 border-blue-500 pl-2">Tài chính & Thanh toán</h4>
            <div className="grid grid-cols-2 gap-4">
              <div><label className={labelCls}>Số lượng <span className="font-normal normal-case text-slate-400">{'{so_luong}'}</span></label><input type="number" min="1" value={form.so_luong} onChange={(e) => updateField('so_luong', e.target.value)} className={`${inputCls} mt-1`} /></div>
              <div><label className={labelCls}>Đơn giá <span className="font-normal normal-case text-slate-400">{'{don_gia}'}</span></label><input inputMode="numeric" value={form.don_gia} onChange={(e) => { const v = e.target.value.replace(/[^0-9.]/g, ''); updateField('don_gia', v); }} placeholder="VD: 8666666" className={`${inputCls} mt-1`} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-3">
              <div><label className={labelCls}>Thành tiền <span className="font-normal normal-case text-slate-400">{'{thanh_tien}'}</span></label><input value={form.thanh_tien} onChange={(e) => updateField('thanh_tien', e.target.value)} className={`${readOnlyCls} mt-1`} readOnly /></div>
              <div><label className={labelCls}>Bằng chữ (Thành tiền) <span className="font-normal normal-case text-slate-400">{'{bang_chu_thanh_tien}'}</span></label><input value={form.bang_chu_thanh_tien} onChange={(e) => updateField('bang_chu_thanh_tien', e.target.value)} className={`${readOnlyCls} mt-1`} readOnly /></div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-3">
              <div><label className={labelCls}>Thực nhận <span className="font-normal normal-case text-slate-400">{'{thuc_nhan}'}</span></label><input value={form.thuc_nhan} onChange={(e) => updateField('thuc_nhan', e.target.value)} className={`${readOnlyCls} mt-1 text-emerald-700 font-medium`} readOnly /></div>
              <div><label className={labelCls}>Bằng chữ (Thực nhận) <span className="font-normal normal-case text-slate-400">{'{bang_chu_thuc_nhan}'}</span></label><input value={form.bang_chu_thuc_nhan} onChange={(e) => updateField('bang_chu_thuc_nhan', e.target.value)} className={`${readOnlyCls} mt-1`} readOnly /></div>
            </div>
          </div>

          {/* Template Override */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase mb-2 border-l-4 border-blue-500 pl-2">File mẫu</h4>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" checked={!useCustomTemplate} onChange={() => setUseCustomTemplate(false)} className="text-blue-600" />
                <span className="text-slate-700">Dùng mẫu mặc định</span>
                {defaultContractTemplate && <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">✓ Đã có</span>}
                {!defaultContractTemplate && <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Chưa upload</span>}
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" checked={useCustomTemplate} onChange={() => setUseCustomTemplate(true)} className="text-blue-600" />
                <span className="text-slate-700">Dùng mẫu riêng cho hợp đồng này</span>
              </label>
              {useCustomTemplate && (
                <div className="grid grid-cols-2 gap-3 mt-2 pl-6 animate-fadeIn">
                  <div>
                    <input ref={customContractRef} type="file" accept=".docx" className="hidden" onChange={(e) => e.target.files?.[0] && setCustomContractFile(e.target.files[0])} />
                    <button onClick={() => customContractRef.current?.click()} className={`w-full border-2 border-dashed rounded-lg p-3 text-xs flex items-center justify-center gap-1.5 transition-colors ${customContractFile ? 'border-green-300 bg-green-50 text-green-700' : 'border-slate-300 text-slate-500 hover:bg-slate-50'}`}>
                      <Upload className="w-3.5 h-3.5" /> {customContractFile ? customContractFile.name : 'Mẫu HĐ (.docx)'}
                    </button>
                  </div>
                  <div>
                    <input ref={customAcceptanceRef} type="file" accept=".docx" className="hidden" onChange={(e) => e.target.files?.[0] && setCustomAcceptanceFile(e.target.files[0])} />
                    <button onClick={() => customAcceptanceRef.current?.click()} className={`w-full border-2 border-dashed rounded-lg p-3 text-xs flex items-center justify-center gap-1.5 transition-colors ${customAcceptanceFile ? 'border-green-300 bg-green-50 text-green-700' : 'border-slate-300 text-slate-500 hover:bg-slate-50'}`}>
                      <Upload className="w-3.5 h-3.5" /> {customAcceptanceFile ? customAcceptanceFile.name : 'Mẫu NT (.docx)'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Download */}
          <div className="flex gap-3">
            <button onClick={() => handleDownload('contract')} disabled={!!isDownloading} className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2.5 px-4 rounded-lg transition-all text-sm shadow-sm">
              {isDownloading === 'contract' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Tải Hợp Đồng
            </button>
            <button onClick={() => handleDownload('acceptance')} disabled={!!isDownloading} className="flex-1 flex items-center justify-center gap-2 bg-white border border-slate-300 hover:bg-slate-50 disabled:bg-slate-100 text-slate-700 font-medium py-2.5 px-4 rounded-lg transition-all text-sm shadow-sm">
              {isDownloading === 'acceptance' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Tải Nghiệm Thu
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
          <button onClick={onClose} disabled={isSaving} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-sm transition-colors disabled:opacity-50">Hủy</button>
          <button onClick={handleSave} disabled={isSaving || !form.profile_id} className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg text-sm hover:bg-blue-700 shadow-sm transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isSaving ? 'Đang lưu...' : (isEdit ? 'Cập nhật' : 'Tạo hợp đồng')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContractModal;
