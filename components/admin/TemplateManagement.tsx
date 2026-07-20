import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  FileText, FileSpreadsheet, Upload, Download, Loader2,
  CheckCircle2, AlertCircle, Building2, Globe, ChevronDown, ChevronUp,
  RefreshCw,
} from 'lucide-react';
import { Department } from '../../types';
import { getDepartments } from '../../services/adminService';
import {
  uploadDefaultTemplate,
  downloadDefaultTemplate,
  uploadAcceptanceExcelTemplate,
  downloadAcceptanceExcelTemplate,
} from '../../services/supabaseService';

type TemplateType = 'contract' | 'acceptance' | 'acceptance_excel';

interface TemplateSlot {
  type: TemplateType;
  label: string;
  ext: string;
  accept: string;
  icon: React.ReactNode;
}

const TEMPLATE_SLOTS: TemplateSlot[] = [
  { type: 'contract',          label: 'Hợp đồng',       ext: '.docx', accept: '.docx', icon: <FileText className="w-4 h-4 text-blue-600" />     },
  { type: 'acceptance',        label: 'Nghiệm thu HĐ',  ext: '.docx', accept: '.docx', icon: <FileText className="w-4 h-4 text-purple-600" />  },
  { type: 'acceptance_excel',  label: 'Biên bản NT',    ext: '.xlsx', accept: '.xlsx', icon: <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> },
];

async function uploadTpl(file: File, type: TemplateType, deptId: string | null): Promise<void> {
  if (type === 'acceptance_excel') return uploadAcceptanceExcelTemplate(file, deptId);
  return uploadDefaultTemplate(file, type, deptId);
}

async function downloadTpl(type: TemplateType, deptId: string | null): Promise<File | null> {
  if (type === 'acceptance_excel') return downloadAcceptanceExcelTemplate(deptId);
  return downloadDefaultTemplate(type, deptId);
}

function triggerDownload(file: File) {
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url; a.download = file.name;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

type SlotStatus = { file: File | null; loaded: boolean; uploading: boolean; downloading: boolean };
type DeptTemplates = Record<TemplateType, SlotStatus>;
const emptySlot = (): SlotStatus => ({ file: null, loaded: false, uploading: false, downloading: false });
const emptyDept = (): DeptTemplates => ({ contract: emptySlot(), acceptance: emptySlot(), acceptance_excel: emptySlot() });

interface SectionProps {
  label: string;
  sublabel?: string;
  departmentId: string | null;
  isGlobal?: boolean;
}

const TemplateSection: React.FC<SectionProps> = ({ label, sublabel, departmentId, isGlobal = false }) => {
  const [open, setOpen] = useState(isGlobal);
  const [tpl, setTpl] = useState<DeptTemplates>(emptyDept());
  const refs = useRef<Record<TemplateType, HTMLInputElement | null>>({ contract: null, acceptance: null, acceptance_excel: null });

  const loadAll = useCallback(async () => {
    await Promise.all(TEMPLATE_SLOTS.map(async s => {
      try {
        const file = await downloadTpl(s.type, departmentId);
        setTpl(p => ({ ...p, [s.type]: { ...p[s.type], file, loaded: true } }));
      } catch {
        setTpl(p => ({ ...p, [s.type]: { ...p[s.type], file: null, loaded: true } }));
      }
    }));
  }, [departmentId]);

  useEffect(() => { if (open) loadAll(); }, [open, loadAll]);

  const handleUpload = async (type: TemplateType, file: File) => {
    setTpl(p => ({ ...p, [type]: { ...p[type], uploading: true } }));
    try {
      await uploadTpl(file, type, departmentId);
      setTpl(p => ({ ...p, [type]: { ...p[type], uploading: false, file, loaded: true } }));
    } catch (err: any) {
      alert('Lỗi upload: ' + err.message);
      setTpl(p => ({ ...p, [type]: { ...p[type], uploading: false } }));
    }
  };

  const handleDownload = async (type: TemplateType) => {
    const cur = tpl[type];
    if (cur.file) { triggerDownload(cur.file); return; }
    setTpl(p => ({ ...p, [type]: { ...p[type], downloading: true } }));
    try {
      const file = await downloadTpl(type, departmentId);
      if (file) { triggerDownload(file); setTpl(p => ({ ...p, [type]: { ...p[type], file, downloading: false, loaded: true } })); }
    } catch { setTpl(p => ({ ...p, [type]: { ...p[type], downloading: false } })); }
  };

  const configuredCount = TEMPLATE_SLOTS.filter(s => tpl[s.type].file).length;
  const allLoaded = TEMPLATE_SLOTS.every(s => tpl[s.type].loaded);

  return (
    <div className={`rounded-xl border overflow-hidden shadow-sm ${isGlobal ? 'border-slate-600' : 'border-slate-200'}`}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full px-5 py-4 flex items-center justify-between transition-colors ${isGlobal ? 'bg-gradient-to-r from-slate-700 to-slate-800' : 'bg-white hover:bg-slate-50'}`}
      >
        <div className="flex items-center gap-3">
          {isGlobal
            ? <Globe className="w-5 h-5 text-slate-300" />
            : <Building2 className="w-5 h-5 text-indigo-500" />}
          <div className="text-left">
            <p className={`text-sm font-semibold ${isGlobal ? 'text-white' : 'text-slate-800'}`}>{label}</p>
            {sublabel && <p className={`text-xs ${isGlobal ? 'text-slate-300' : 'text-slate-400'}`}>{sublabel}</p>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {allLoaded && open && (
            configuredCount === 3
              ? <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Đầy đủ</span>
              : configuredCount === 0
                ? <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">{isGlobal ? 'Chưa có' : 'Dùng mặc định'}</span>
                : <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{configuredCount}/3 mẫu</span>
          )}
          {open
            ? <ChevronUp className={`w-4 h-4 ${isGlobal ? 'text-slate-300' : 'text-slate-400'}`} />
            : <ChevronDown className={`w-4 h-4 ${isGlobal ? 'text-slate-300' : 'text-slate-400'}`} />}
        </div>
      </button>

      {open && (
        <div className="bg-white border-t border-slate-100 divide-y divide-slate-100 animate-fadeIn">
          {TEMPLATE_SLOTS.map(slot => {
            const st = tpl[slot.type];
            return (
              <div key={slot.type} className="px-5 py-3.5 flex items-center gap-4">
                <input
                  type="file" accept={slot.accept} className="hidden"
                  ref={el => { refs.current[slot.type] = el; }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(slot.type, f); e.target.value = ''; }}
                />
                <div className="flex items-center gap-2 w-44 flex-shrink-0">
                  {slot.icon}
                  <div>
                    <p className="text-sm font-medium text-slate-800">{slot.label}</p>
                    <p className="text-xs text-slate-400">{slot.ext}</p>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  {!st.loaded
                    ? <span className="text-xs text-slate-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Đang kiểm tra...</span>
                    : st.file
                      ? <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md flex items-center gap-1 w-fit">
                          <CheckCircle2 className="w-3 h-3" />
                          <span className="truncate max-w-[200px]">{st.file.name}</span>
                        </span>
                      : <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-md flex items-center gap-1 w-fit">
                          <AlertCircle className="w-3 h-3" />
                          {isGlobal ? 'Chưa có mẫu mặc định' : 'Dùng mẫu mặc định'}
                        </span>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {st.file && (
                    <button
                      onClick={() => handleDownload(slot.type)}
                      disabled={st.downloading}
                      title="Tải xuống để chỉnh sửa"
                      className="flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {st.downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                      Tải về
                    </button>
                  )}
                  <button
                    onClick={() => refs.current[slot.type]?.click()}
                    disabled={st.uploading}
                    className="flex items-center gap-1.5 text-xs text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 shadow-sm"
                  >
                    {st.uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    {st.file ? 'Cập nhật' : 'Upload'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const TemplateManagement: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true); setError('');
    try { setDepartments(await getDepartments()); }
    catch (err: any) { setError(err.message); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="flex items-start justify-between">
        <p className="text-sm text-slate-500 max-w-xl">
          Quản lý 3 loại mẫu tài liệu cho từng phòng ban. Nếu phòng ban chưa có mẫu riêng,
          hệ thống tự động dùng <span className="font-medium text-slate-700">mẫu mặc định</span>.
          Upload mẫu mới sẽ tự động lưu và áp dụng cho lần tiếp theo.
        </p>
        <button onClick={load} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0 ml-4">
          <RefreshCw className="w-3.5 h-3.5" /> Làm mới
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /><span>{error}</span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 bg-slate-50 rounded-lg px-4 py-2.5 border border-slate-200">
        <span className="font-medium text-slate-600">Loại mẫu:</span>
        <span className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-blue-500" /> Hợp đồng (.docx)</span>
        <span className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-purple-500" /> Nghiệm thu HĐ (.docx)</span>
        <span className="flex items-center gap-1.5"><FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" /> Biên bản NT (.xlsx)</span>
      </div>

      <TemplateSection label="Mẫu Mặc Định (Toàn Hệ Thống)" sublabel="Áp dụng cho mọi phòng ban chưa có mẫu riêng" departmentId={null} isGlobal />

      {departments.length === 0
        ? <div className="py-10 text-center text-slate-400"><Building2 className="w-10 h-10 mx-auto mb-2 opacity-30" /><p className="text-sm">Chưa có phòng ban nào.</p></div>
        : departments.map(dept => (
            <TemplateSection key={dept.id} label={dept.name} sublabel={dept.campus?.name} departmentId={dept.id} />
          ))}
    </div>
  );
};

export default TemplateManagement;
