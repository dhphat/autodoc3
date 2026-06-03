import React, { useState, useMemo } from 'react';
import {
  Search, Users, FileSpreadsheet, PlusCircle, Trash2,
  Download, Loader2, CheckCircle2, ChevronRight, ChevronLeft, X,
} from 'lucide-react';
import { SavedProfile, AcceptancePersonEntry, AcceptanceReportData } from '../types';
import { generateAcceptanceExcel, generatePaymentExcel, generateTransferExcel } from '../services/excelService';
import { generateImageDocx } from '../services/docxService';

interface AcceptanceTabProps {
  profiles: SavedProfile[];
}

type Step = 1 | 2 | 3;

const formatMoney = (num: number): string => {
  if (!num || num === 0) return '';
  return Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

const parseMoney = (val: string): number => {
  return parseFloat(val.replace(/[.\s]/g, '')) || 0;
};

const AcceptanceTab: React.FC<AcceptanceTabProps> = ({ profiles }) => {
  const [step, setStep] = useState<Step>(1);

  // Step 1: Selected profiles (using array to maintain order)
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [profileSearch, setProfileSearch] = useState('');

  // Step 2: Report info + per-person financial data
  const [tenBienBan, setTenBienBan] = useState('');
  const [soBienBan, setSoBienBan] = useState('');
  const [nguoiLap, setNguoiLap] = useState('');
  const [nguoiPheDuyet, setNguoiPheDuyet] = useState('');
  const [entries, setEntries] = useState<Record<string, {
    so_tien_truoc_thue: string;
    thue_tncn: string;
    so_tien_thuc_chi: string;
    noi_dung_cong_viec: string;
  }>>({});

  // Step 3: Exporting
  const [isExporting, setIsExporting] = useState(false);
  const [exportDone, setExportDone] = useState(false);

  // Filter profiles for search
  const filteredProfiles = useMemo(() => {
    if (!profileSearch.trim()) return profiles;
    const q = profileSearch.toLowerCase();
    return profiles.filter(p =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.data['ho_ten'] || '').toLowerCase().includes(q) ||
      (p.data['cccd'] || '').includes(q) ||
      (p.data['ma_cbnv'] || '').includes(q) ||
      (p.data['mst'] || '').includes(q)
    );
  }, [profiles, profileSearch]);

  // Get selected profiles in order of selection
  const selectedProfiles = useMemo(() => {
    return selectedIds
      .map(id => profiles.find(p => p.id === id))
      .filter((p): p is SavedProfile => !!p);
  }, [profiles, selectedIds]);

  const toggleProfile = (id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(item => item !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const selectAll = () => {
    const newIds = [...selectedIds];
    filteredProfiles.forEach(p => {
      if (!newIds.includes(p.id)) {
        newIds.push(p.id);
      }
    });
    setSelectedIds(newIds);
  };

  const deselectAll = () => {
    setSelectedIds([]);
  };

  // Initialize entries when moving to step 2
  const goToStep2 = () => {
    const newEntries: typeof entries = {};
    selectedProfiles.forEach(p => {
      if (!entries[p.id]) {
        newEntries[p.id] = {
          so_tien_truoc_thue: '',
          thue_tncn: '',
          so_tien_thuc_chi: '',
          noi_dung_cong_viec: '',
        };
      } else {
        newEntries[p.id] = entries[p.id];
      }
    });
    setEntries(newEntries);
    setStep(2);
  };

  const updateEntry = (profileId: string, field: string, value: string) => {
    setEntries(prev => {
      const updated = { ...prev };
      updated[profileId] = { ...updated[profileId], [field]: value };

      // Auto-calc: thực chi = trước thuế - thuế
      if (field === 'so_tien_truoc_thue' || field === 'thue_tncn') {
        const truocThue = parseMoney(field === 'so_tien_truoc_thue' ? value : updated[profileId].so_tien_truoc_thue);
        const thue = parseMoney(field === 'thue_tncn' ? value : updated[profileId].thue_tncn);
        const thucChi = truocThue - thue;
        updated[profileId].so_tien_thuc_chi = thucChi > 0 ? formatMoney(thucChi) : '';
      }

      return updated;
    });
  };

  // Calculate totals
  const totals = useMemo(() => {
    let totalTruocThue = 0;
    let totalThue = 0;
    let totalThucChi = 0;
    selectedProfiles.forEach(p => {
      const e = entries[p.id];
      if (e) {
        totalTruocThue += parseMoney(e.so_tien_truoc_thue);
        totalThue += parseMoney(e.thue_tncn);
        totalThucChi += parseMoney(e.so_tien_thuc_chi);
      }
    });
    return { totalTruocThue, totalThue, totalThucChi };
  }, [selectedProfiles, entries]);

  // Export
  const handleExport = async () => {
    setIsExporting(true);
    setExportDone(false);
    try {
      const reportEntries: AcceptancePersonEntry[] = selectedProfiles.map((p, idx) => {
        const e = entries[p.id] || {};
        return {
          profile_id: p.id,
          ho_ten: p.data['ho_ten'] || p.name,
          cccd: p.data['cccd'] || '',
          ma_cbnv: p.data['ma_cbnv'] || '',
          mst: p.data['mst'] || '',
          so_tien_truoc_thue: parseMoney(e.so_tien_truoc_thue || ''),
          thue_tncn: parseMoney(e.thue_tncn || ''),
          so_tien_thuc_chi: parseMoney(e.so_tien_thuc_chi || ''),
          noi_dung_cong_viec: e.noi_dung_cong_viec || '',
          ket_qua: 'Hoàn thành',
        };
      });

      const reportData: AcceptanceReportData = {
        ten_bien_ban: tenBienBan,
        so_bien_ban: soBienBan,
        nguoi_lap: nguoiLap,
        nguoi_phe_duyet: nguoiPheDuyet,
        entries: reportEntries,
      };

      await generateAcceptanceExcel(reportData);
      
      // Export Payment Excel
      await generatePaymentExcel(selectedProfiles, reportEntries, soBienBan);
      
      // Export Transfer Excel
      await generateTransferExcel(selectedProfiles, reportEntries, soBienBan);
      
      // Export Images DOCX
      await generateImageDocx(selectedProfiles, soBienBan);

      setExportDone(true);
    } catch (err: any) {
      alert('Lỗi xuất file: ' + (err.message || err));
    } finally {
      setIsExporting(false);
    }
  };

  const canExport = tenBienBan.trim() && soBienBan.trim() && nguoiLap.trim() && nguoiPheDuyet.trim() && selectedProfiles.length > 0;

  const inputCls = 'w-full border border-slate-300 bg-slate-50 rounded-lg px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all';
  const labelCls = 'text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block';

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Step Indicator */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex items-center justify-center gap-2 sm:gap-4">
          {[
            { num: 1, label: 'Chọn người', icon: Users },
            { num: 2, label: 'Nhập thông tin', icon: FileSpreadsheet },
            { num: 3, label: 'Xem & Xuất', icon: Download },
          ].map((s, i) => (
            <React.Fragment key={s.num}>
              {i > 0 && <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />}
              <button
                onClick={() => {
                  if (s.num === 1) setStep(1);
                  else if (s.num === 2 && selectedIds.length > 0) goToStep2();
                  else if (s.num === 3 && selectedIds.length > 0) setStep(3);
                }}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all
                  ${step === s.num
                    ? 'bg-blue-600 text-white shadow-sm'
                    : step > s.num
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-100 text-slate-400'
                  }`}
              >
                {step > s.num ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <s.icon className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">{s.label}</span>
                <span className="sm:hidden">{s.num}</span>
              </button>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ======================== Step 1: Select Profiles ======================== */}
      {step === 1 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  Chọn người nghiệm thu
                </h2>
                <p className="text-sm text-slate-500">
                  Đã chọn <span className="font-semibold text-blue-600">{selectedIds.length}</span> / {profiles.length} hồ sơ
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={selectAll} className="text-xs text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors">
                  Chọn tất cả
                </button>
                <button onClick={deselectAll} className="text-xs text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors">
                  Bỏ chọn
                </button>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm theo tên, CCCD, Mã CBNV, MST..."
                value={profileSearch}
                onChange={(e) => setProfileSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto max-h-[50vh] overflow-y-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase w-10">
                   <input
                      type="checkbox"
                      checked={filteredProfiles.length > 0 && filteredProfiles.every(p => selectedIds.includes(p.id))}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds(prev => {
                            const next = [...prev];
                            filteredProfiles.forEach(p => {
                              if (!next.includes(p.id)) next.push(p.id);
                            });
                            return next;
                          });
                        } else {
                          setSelectedIds(prev => {
                            return prev.filter(id => !filteredProfiles.some(p => p.id === id));
                          });
                        }
                      }}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300"
                    />
                  </th>
                  <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Họ và tên</th>
                  <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Số CMND</th>
                  <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Mã CBNV/HSSV</th>
                  <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Mã số thuế</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProfiles.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
                      <p>{profiles.length === 0 ? 'Chưa có hồ sơ nào.' : 'Không tìm thấy kết quả.'}</p>
                    </td>
                  </tr>
                ) : (
                  filteredProfiles.map(p => (
                    <tr
                      key={p.id}
                      onClick={() => toggleProfile(p.id)}
                       className={`cursor-pointer transition-colors ${
                        selectedIds.includes(p.id)
                          ? 'bg-blue-50/60 hover:bg-blue-50'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-3 px-4">
                         <input
                          type="checkbox"
                          checked={selectedIds.includes(p.id)}
                          onChange={() => toggleProfile(p.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 text-blue-600 rounded border-slate-300"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-sm text-slate-900">{p.data['ho_ten'] || p.name}</div>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600 font-mono">{p.data['cccd'] || '—'}</td>
                      <td className="py-3 px-4 text-sm text-slate-600 font-mono">{p.data['ma_cbnv'] || '—'}</td>
                      <td className="py-3 px-4 text-sm text-slate-600 font-mono">{p.data['mst'] || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Selected preview + Next */}
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
            <div className="flex flex-wrap gap-1.5 max-w-[70%]">
              {selectedProfiles.slice(0, 5).map(p => (
                <span key={p.id} className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-xs font-medium px-2 py-1 rounded-full">
                  {p.data['ho_ten'] || p.name}
                  <button onClick={(e) => { e.stopPropagation(); toggleProfile(p.id); }} className="hover:text-blue-900">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {selectedProfiles.length > 5 && (
                <span className="text-xs text-slate-500 px-2 py-1">+{selectedProfiles.length - 5} người khác</span>
              )}
            </div>
             <button
              onClick={goToStep2}
              disabled={selectedIds.length === 0}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors shadow-sm"
            >
              Tiếp theo <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ======================== Step 2: Enter Info ======================== */}
      {step === 2 && (
        <div className="space-y-6">
          {/* Report-level info */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 border-b pb-2">
              <FileSpreadsheet className="w-4 h-4 text-blue-600" />
              Thông tin Biên bản
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Tên biên bản <span className="text-red-400">*</span></label>
                <input
                  value={tenBienBan}
                  onChange={(e) => setTenBienBan(e.target.value)}
                  placeholder="VD: CTV PHÒNG SÁNG TẠO NỘI DUNG THÁNG 02.2026"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Số biên bản <span className="text-red-400">*</span></label>
                <input
                  value={soBienBan}
                  onChange={(e) => setSoBienBan(e.target.value)}
                  placeholder="VD: 28022026/STND-FPT/BBNT-NCC"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Tên người lập <span className="text-red-400">*</span></label>
                <input
                  value={nguoiLap}
                  onChange={(e) => setNguoiLap(e.target.value)}
                  placeholder="VD: Phạm Tuyết Hạnh Hà"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Tên người phê duyệt <span className="text-red-400">*</span></label>
                <input
                  value={nguoiPheDuyet}
                  onChange={(e) => setNguoiPheDuyet(e.target.value)}
                  placeholder="VD: Nguyễn Chí Công"
                  className={inputCls}
                />
              </div>
            </div>
          </div>

          {/* Per-person data */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                Thông tin chi trả ({selectedProfiles.length} người)
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1100px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="py-3 px-3 text-xs font-semibold text-slate-500 uppercase w-10">STT</th>
                    <th className="py-3 px-3 text-xs font-semibold text-slate-500 uppercase">Họ và tên</th>
                    <th className="py-3 px-3 text-xs font-semibold text-slate-500 uppercase">Số CMND</th>
                    <th className="py-3 px-3 text-xs font-semibold text-slate-500 uppercase">Mã CBNV</th>
                    <th className="py-3 px-3 text-xs font-semibold text-slate-500 uppercase">MST</th>
                    <th className="py-3 px-3 text-xs font-semibold text-slate-500 uppercase min-w-[140px]">
                      <span className="text-red-500">Trước thuế *</span>
                    </th>
                    <th className="py-3 px-3 text-xs font-semibold text-slate-500 uppercase min-w-[130px]">
                      <span className="text-red-500">Thuế TNCN *</span>
                    </th>
                    <th className="py-3 px-3 text-xs font-semibold text-slate-500 uppercase min-w-[140px]">
                      <span className="text-emerald-600">Thực chi trả</span>
                    </th>
                    <th className="py-3 px-3 text-xs font-semibold text-slate-500 uppercase min-w-[200px]">
                      <span className="text-red-500">Nội dung CV *</span>
                    </th>
                    <th className="py-3 px-3 text-xs font-semibold text-slate-500 uppercase w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedProfiles.map((p, idx) => {
                    const entry = entries[p.id] || { so_tien_truoc_thue: '', thue_tncn: '', so_tien_thuc_chi: '', noi_dung_cong_viec: '' };
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/50">
                        <td className="py-2 px-3 text-center text-xs text-slate-500">{idx + 1}</td>
                        <td className="py-2 px-3 text-sm font-medium text-slate-900 whitespace-nowrap">{p.data['ho_ten'] || p.name}</td>
                        <td className="py-2 px-3 text-xs text-slate-600 font-mono">{p.data['cccd'] || '—'}</td>
                        <td className="py-2 px-3 text-xs text-slate-600 font-mono">{p.data['ma_cbnv'] || '—'}</td>
                        <td className="py-2 px-3 text-xs text-slate-600 font-mono">{p.data['mst'] || '—'}</td>
                        <td className="py-2 px-3">
                          <input
                            value={entry.so_tien_truoc_thue}
                            onChange={(e) => updateEntry(p.id, 'so_tien_truoc_thue', e.target.value.replace(/[^0-9.]/g, ''))}
                            placeholder="1.000.000"
                            className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm text-right focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            value={entry.thue_tncn}
                            onChange={(e) => updateEntry(p.id, 'thue_tncn', e.target.value.replace(/[^0-9.]/g, ''))}
                            placeholder="0"
                            className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm text-right focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <div className="w-full border border-emerald-200 bg-emerald-50 rounded-md px-2 py-1.5 text-sm text-right text-emerald-700 font-medium">
                            {entry.so_tien_thuc_chi || '—'}
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          <textarea
                            value={entry.noi_dung_cong_viec}
                            onChange={(e) => updateEntry(p.id, 'noi_dung_cong_viec', e.target.value)}
                            placeholder="Mô tả công việc đã làm..."
                            rows={2}
                            className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none resize-y min-h-[40px]"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <button
                            onClick={() => toggleProfile(p.id)}
                            className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors"
                            title="Xoá khỏi danh sách"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {/* Tổng cộng */}
                  <tr className="bg-slate-50 border-t-2 border-slate-200">
                    <td colSpan={5} className="py-3 px-3 text-sm font-bold text-slate-700 text-center">Tổng cộng</td>
                    <td className="py-3 px-3 text-sm font-bold text-slate-800 text-right">{formatMoney(totals.totalTruocThue)}</td>
                    <td className="py-3 px-3 text-sm font-bold text-slate-800 text-right">{totals.totalThue ? formatMoney(totals.totalThue) : '-'}</td>
                    <td className="py-3 px-3 text-sm font-bold text-emerald-700 text-right">{formatMoney(totals.totalThucChi)}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800 bg-white border border-slate-300 px-4 py-2.5 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Quay lại
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!canExport}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors shadow-sm"
            >
              Xem trước & Xuất <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ======================== Step 3: Preview & Export ======================== */}
      {step === 3 && (
        <div className="space-y-6">
          {/* Preview */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                Xem trước Biên bản Nghiệm thu
              </h3>
            </div>

            <div className="p-6 overflow-x-auto">
              {/* Preview Table */}
              <div className="border border-slate-300 rounded-lg overflow-hidden bg-white max-w-full">
                {/* Header */}
                <div className="grid grid-cols-2 p-3 border-b border-slate-200">
                  <div className="text-center">
                    <p className="font-bold text-xs">TRƯỜNG ĐẠI HỌC FPT</p>
                    <p className="font-bold text-xs">Ban Công tác học đường</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-xs">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                    <p className="font-bold text-xs underline">Độc lập - Tự do - Hạnh phúc</p>
                  </div>
                </div>

                {/* Title */}
                <div className="text-center py-3 border-b border-slate-200">
                  <p className="font-bold text-sm">
                    BIÊN BẢN NGHIỆM THU CÔNG VIỆC HOÀN THÀNH {tenBienBan}
                  </p>
                  <p className="text-xs mt-1">
                    Số: <span className="font-bold">{soBienBan}</span>
                  </p>
                </div>

                {/* Data Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse min-w-[900px]">
                    <thead>
                      <tr className="bg-slate-50">
                        {['STT', 'Họ và tên', 'Số CMND', 'Mã CBNV/\nHSSV', 'Mã số thuế',
                          'Số tiền chi trả\ntrước thuế', 'Thuế TNCN\ntạm khấu trừ', 'Số tiền thực\nchi trả',
                          'Nội dung công việc đã làm', 'Kết quả công\nviệc', 'Ký xác nhận',
                        ].map((h, i) => (
                          <th key={i} className="border border-slate-300 px-2 py-2 text-center font-bold whitespace-pre-line text-[10px]">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedProfiles.map((p, idx) => {
                        const e = entries[p.id] || { so_tien_truoc_thue: '', thue_tncn: '', so_tien_thuc_chi: '', noi_dung_cong_viec: '' };
                        return (
                          <tr key={p.id}>
                            <td className="border border-slate-300 px-2 py-1.5 text-center">{idx + 1}</td>
                            <td className="border border-slate-300 px-2 py-1.5">{p.data['ho_ten'] || p.name}</td>
                            <td className="border border-slate-300 px-2 py-1.5">{p.data['cccd'] || ''}</td>
                            <td className="border border-slate-300 px-2 py-1.5">{p.data['ma_cbnv'] || ''}</td>
                            <td className="border border-slate-300 px-2 py-1.5">{p.data['mst'] || ''}</td>
                            <td className="border border-slate-300 px-2 py-1.5 text-right">{e.so_tien_truoc_thue || ''}</td>
                            <td className="border border-slate-300 px-2 py-1.5 text-right">{parseMoney(e.thue_tncn) ? e.thue_tncn : '-'}</td>
                            <td className="border border-slate-300 px-2 py-1.5 text-right">{e.so_tien_thuc_chi || ''}</td>
                            <td className="border border-slate-300 px-2 py-1.5">{e.noi_dung_cong_viec || ''}</td>
                            <td className="border border-slate-300 px-2 py-1.5 text-center">Hoàn thành</td>
                            <td className="border border-slate-300 px-2 py-1.5"></td>
                          </tr>
                        );
                      })}
                      <tr className="font-bold bg-slate-50">
                        <td colSpan={5} className="border border-slate-300 px-2 py-1.5 text-center">Tổng cộng</td>
                        <td className="border border-slate-300 px-2 py-1.5 text-right">{formatMoney(totals.totalTruocThue)}</td>
                        <td className="border border-slate-300 px-2 py-1.5 text-right">{totals.totalThue ? formatMoney(totals.totalThue) : '-'}</td>
                        <td className="border border-slate-300 px-2 py-1.5 text-right">{formatMoney(totals.totalThucChi)}</td>
                        <td colSpan={3} className="border border-slate-300 px-2 py-1.5"></td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Footer */}
                <div className="grid grid-cols-2 p-4 pt-6">
                  <div className="text-center">
                    <p className="font-bold text-xs mb-8">NGƯỜI LẬP</p>
                    <p className="font-bold text-xs">{nguoiLap}</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-xs mb-8">NGƯỜI PHÊ DUYỆT</p>
                    <p className="font-bold text-xs">{nguoiPheDuyet}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800 bg-white border border-slate-300 px-4 py-2.5 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Quay lại sửa
            </button>
            <div className="flex items-center gap-3">
              {exportDone && (
                <span className="flex items-center gap-1.5 text-sm text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4" /> Đã xuất thành công!
                </span>
              )}
              <button
                onClick={handleExport}
                disabled={isExporting || !canExport}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-colors shadow-sm"
              >
                {isExporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {isExporting ? 'Đang xuất...' : 'Xuất file Excel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AcceptanceTab;
