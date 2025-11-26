
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { FileText, Download, Sparkles, AlertCircle, RefreshCw, Wand2, Info, CheckCircle2, AlertTriangle, Image as ImageIcon, User, Save, Upload, Settings, Database, PlusCircle, LayoutList, Loader2 } from 'lucide-react';
import FileUpload from './components/FileUpload';
import InputField from './components/InputField';
import Toast from './components/Toast';
import ProfileListTab from './components/ProfileListTab';
import ProfileEditModal from './components/ProfileEditModal';
import { DocField, DEFAULT_FIELDS, SavedProfile } from './types';
import { extractKeysFromDocx, generateDocument } from './services/docxService';
import { extractDataFromText } from './services/geminiService';
import { numberToVietnameseText } from './utils/numberToText';
import { validateField } from './utils/validation';
import { getProfilesFromCloud, saveProfileToCloud, updateProfileOnCloud, deleteProfileFromCloud } from './services/firebaseService';

type Tab = 'create' | 'profiles';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('create');
  
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [acceptanceFile, setAcceptanceFile] = useState<File | null>(null);
  
  // Fields management
  const [fields, setFields] = useState<DocField[]>(DEFAULT_FIELDS);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  // Images for ID Card (Main Form)
  const [idCardFront, setIdCardFront] = useState<File | null>(null);
  const [idCardBack, setIdCardBack] = useState<File | null>(null);

  // Profiles
  const [savedProfiles, setSavedProfiles] = useState<SavedProfile[]>([]);
  const [editingProfile, setEditingProfile] = useState<SavedProfile | null>(null);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(false);
  const [isSavingNewProfile, setIsSavingNewProfile] = useState(false); // New state for loading button

  // UI States
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // AI related state
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [showAiInput, setShowAiInput] = useState<boolean>(false);

  // Banks Data
  const [banks, setBanks] = useState<{shortName: string, name: string}[]>([]);

  const loadProfiles = useCallback(async () => {
        setIsLoadingProfiles(true);
        try {
            const profiles = await getProfilesFromCloud();
            // Sort by createdAt desc
            profiles.sort((a, b) => b.createdAt - a.createdAt);
            setSavedProfiles(profiles);
        } catch (error) {
            console.error("Failed to load profiles from cloud", error);
        } finally {
            setIsLoadingProfiles(false);
        }
    }, []);

  // --- Initial Load & Bank API ---
  useEffect(() => {
    // Load Profiles from Cloud
    loadProfiles();

    // Load Banks
    fetch('https://api.vietqr.io/v2/banks')
      .then(res => res.json())
      .then(data => {
         if (data && data.data) {
             setBanks(data.data.map((b: any) => ({ shortName: b.shortName, name: b.name })));
         }
      })
      .catch(err => console.error("Failed to load banks", err));
  }, [loadProfiles]);

  // Update Bank Options in Fields
  useEffect(() => {
    if (banks.length > 0) {
        setFields(prev => prev.map(f => {
            if (f.key === 'ngan_hang') {
                return {
                    ...f,
                    options: banks.map(b => ({ label: `${b.shortName} - ${b.name}`, value: `${b.name} (${b.shortName})` }))
                };
            }
            return f;
        }));
    }
  }, [banks]);

  // Validation Logic
  const filledFieldsCount = useMemo(() => fields.filter(f => f.value.trim() !== '').length, [fields]);
  const totalFieldsCount = fields.length;
  const hasEnteredData = filledFieldsCount > 0;

  // --- Auto Calculation & Transform Logic ---
  useEffect(() => {
    const slField = fields.find(f => f.key === 'so_luong');
    const dgField = fields.find(f => f.key === 'don_gia');

    if (!slField || !dgField) return;

    const parseMoney = (val: string) => parseFloat(val.replace(/[\.,\s]/g, ''));
    const sl = parseMoney(slField.value);
    const dg = parseMoney(dgField.value);

    if (!isNaN(sl) && !isNaN(dg)) {
        const thanhTien = sl * dg;
        const thucNhan = thanhTien * 0.9;

        const formatCurrency = (num: number) => Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
        
        const ttStr = formatCurrency(thanhTien);
        const tnStr = formatCurrency(thucNhan);
        const ttText = numberToVietnameseText(Math.round(thanhTien));
        const tnText = numberToVietnameseText(Math.round(thucNhan));

        const currentTT = fields.find(f => f.key === 'thanh_tien')?.value;
        const currentTN = fields.find(f => f.key === 'thuc_nhan')?.value;
        const currentTextTT = fields.find(f => f.key === 'bang_chu_thanh_tien')?.value;
        const currentTextTN = fields.find(f => f.key === 'bang_chu_thuc_nhan')?.value;

        if (currentTT !== ttStr || currentTN !== tnStr || currentTextTT !== ttText || currentTextTN !== tnText) {
             setFields(prev => prev.map(f => {
                if (f.key === 'thanh_tien') return { ...f, value: ttStr };
                if (f.key === 'thuc_nhan') return { ...f, value: tnStr };
                if (f.key === 'bang_chu_thanh_tien') return { ...f, value: ttText };
                if (f.key === 'bang_chu_thuc_nhan') return { ...f, value: tnText };
                return f;
             }));
        }
    }
  }, [fields]);

  // --- Handlers ---

  const handleSaveProfile = async () => {
    const partyBFields = fields.filter(f => f.section === 'Party B');
    const nameField = partyBFields.find(f => f.key === 'ho_ten');
    const profileName = nameField?.value.trim();

    if (!profileName) {
      alert("Vui lòng nhập 'Họ tên' trước khi lưu hồ sơ.");
      return;
    }

    setIsSavingNewProfile(true);

    // Convert Images to Base64 for storage with Compression
    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    // OPTIMIZED: Reduce max width to 600px
                    const MAX_WIDTH = 600;
                    let width = img.width;
                    let height = img.height;
                    
                    if (width > MAX_WIDTH) {
                        height = (height * MAX_WIDTH) / width;
                        width = MAX_WIDTH;
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);
                    
                    // OPTIMIZED: Compress to JPEG 0.6 quality
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
                    resolve(dataUrl);
                };
                img.onerror = error => reject(error);
            };
            reader.onerror = error => reject(error);
        });
    };

    let frontBase64 = null;
    let backBase64 = null;
    
    try {
        if (idCardFront) frontBase64 = await fileToBase64(idCardFront);
        if (idCardBack) backBase64 = await fileToBase64(idCardBack);
    } catch (e) {
        alert("Lỗi khi xử lý ảnh.");
        setIsSavingNewProfile(false);
        return;
    }

    const profileData: Record<string, string> = {};
    partyBFields.forEach(f => profileData[f.key] = f.value);

    const newProfile: SavedProfile = {
      id: Date.now().toString(),
      name: profileName,
      data: profileData,
      idCardFront: frontBase64,
      idCardBack: backBase64,
      createdAt: Date.now()
    };

    try {
        await saveProfileToCloud(newProfile);
        
        // Optimistic update: Add to list immediately without re-fetching
        setSavedProfiles(prev => [newProfile, ...prev]);
        setToastMessage("Đã lưu hồ sơ lên Cloud thành công!");
    } catch (error: any) {
        alert("Lỗi khi lưu hồ sơ: " + error.message);
    } finally {
        setIsSavingNewProfile(false);
    }
  };

  const handleUpdateProfile = async (updatedProfile: SavedProfile): Promise<void> => {
    try {
        await updateProfileOnCloud(updatedProfile);
        
        // Optimization: Update local state immediately instead of reloading everything
        // This avoids the long delay of downloading all images again
        setSavedProfiles(prev => prev.map(p => p.id === updatedProfile.id ? updatedProfile : p));
        
        setToastMessage("Đã cập nhật hồ sơ!");
    } catch (error: any) {
        alert("Lỗi khi cập nhật: " + error.message);
        throw error; // Rethrow so modal stays open
    }
  };

  const handleLoadProfile = (profileId: string) => {
    const profile = savedProfiles.find(p => p.id === profileId);
    if (!profile) return;

    // Load Text Fields
    setFields(prev => prev.map(f => {
      if (profile.data[f.key] !== undefined) {
        return { ...f, value: profile.data[f.key] };
      }
      return f;
    }));

    // Convert Base64 back to File objects for preview state
    const base64ToFile = async (base64: string, filename: string): Promise<File> => {
        const res = await fetch(base64);
        const buf = await res.arrayBuffer();
        return new File([buf], filename, { type: 'image/jpeg' });
    };

    if (profile.idCardFront) {
        base64ToFile(profile.idCardFront, "CCCD_Mat_Truoc.jpg").then(setIdCardFront);
    } else {
        setIdCardFront(null);
    }

    if (profile.idCardBack) {
        base64ToFile(profile.idCardBack, "CCCD_Mat_Sau.jpg").then(setIdCardBack);
    } else {
        setIdCardBack(null);
    }
  };

  const handleDeleteProfile = async (profileId: string) => {
    if(window.confirm('Bạn có chắc muốn xóa hồ sơ này vĩnh viễn?')) {
        try {
            await deleteProfileFromCloud(profileId);
            const updated = savedProfiles.filter(p => p.id !== profileId);
            setSavedProfiles(updated);
            setToastMessage("Đã xóa hồ sơ khỏi Cloud.");
        } catch (error: any) {
            alert("Lỗi khi xóa: " + error.message);
        }
    }
  }

  const handleFileUpload = async (file: File, type: 'contract' | 'acceptance') => {
    if (type === 'contract') setContractFile(file);
    else setAcceptanceFile(file);

    const keys = await extractKeysFromDocx(file);
    if (keys.length > 0) {
      setFields(prev => {
        const newFields = [...prev];
        keys.forEach(key => {
          if (!newFields.find(f => f.key === key)) {
            newFields.push({
              key,
              label: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
              value: '',
              section: 'Other',
              type: 'text'
            });
          }
        });
        return newFields;
      });
    }
  };

  const updateFieldValue = (key: string, value: string) => {
    let finalValue = value;
    
    // Auto Uppercase Name
    if (key === 'ho_ten') {
        finalValue = value.toUpperCase();
    }

    // Update Field
    setFields(prev => prev.map(f => f.key === key ? { ...f, value: finalValue } : f));

    // Validate
    const error = validateField(key, finalValue);
    setValidationErrors(prev => ({ ...prev, [key]: error || '' }));
  };

  const handleAiAutoFill = async () => {
    if (!aiPrompt.trim()) return;
    setIsAiLoading(true);
    setAiError(null);
    try {
      const extractedData = await extractDataFromText(aiPrompt, fields);
      setFields(prev => prev.map(f => {
        if (extractedData[f.key]) {
          return { ...f, value: extractedData[f.key]! };
        }
        return f;
      }));
      setShowAiInput(false);
    } catch (err) {
      setAiError("Không thể trích xuất dữ liệu.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const fileToArrayBuffer = (file: File): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as ArrayBuffer);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const generationData = useMemo(() => {
    const data: Record<string, string> = {};
    fields.forEach(f => data[f.key] = f.value);
    return data;
  }, [fields]);

  const handleGenerate = async (type: 'contract' | 'acceptance') => {
    const file = type === 'contract' ? contractFile : acceptanceFile;
    if (!file) return;
    
    // Check if any errors
    const hasErrors = Object.values(validationErrors).some(err => err !== '');
    if (hasErrors) {
        alert("Vui lòng sửa các lỗi nhập liệu (màu đỏ) trước khi xuất file.");
        return;
    }

    if (!hasEnteredData) {
      alert("Vui lòng nhập thông tin.");
      return;
    }

    if (filledFieldsCount < totalFieldsCount) {
      const confirm = window.confirm(`Bạn mới điền ${filledFieldsCount}/${totalFieldsCount} trường. Tiếp tục?`);
      if (!confirm) return;
    }

    const images: Record<string, ArrayBuffer | null> = {};
    if (idCardFront) images['cccd_truoc'] = await fileToArrayBuffer(idCardFront);
    if (idCardBack) images['cccd_sau'] = await fileToArrayBuffer(idCardBack);

    const fileName = type === 'contract' 
      ? `HopDong_${generationData['ho_ten'] || 'Moi'}.docx` 
      : `NghiemThu_${generationData['ho_ten'] || 'Moi'}.docx`;

    generateDocument({ file, data: generationData, fileName, images });
  };

  // Group fields
  const groupedFields = useMemo(() => {
    const groups: Record<string, DocField[]> = {};
    fields.forEach(field => {
      const section = field.section || 'Other';
      if (!groups[section]) groups[section] = [];
      groups[section].push(field);
    });
    return groups;
  }, [fields]);

  const getSectionTitle = (section: string) => {
    switch(section) {
      case 'General': return 'Thông tin chung';
      case 'Time': return 'Thời gian';
      case 'Party A': return 'Thông tin Bên A';
      case 'Party B': return 'Thông tin Cá nhân (Bên B)';
      case 'Job': return 'Thông tin Công việc';
      case 'Financial': return 'Tài chính & Thanh toán';
      default: return 'Thông tin khác';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}
      
      <ProfileEditModal 
        isOpen={!!editingProfile}
        profile={editingProfile}
        fieldDefinitions={fields} // Pass current fields (with loaded banks) to modal
        onClose={() => setEditingProfile(null)}
        onSave={handleUpdateProfile}
      />

      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-800">AutoDoc Legal</h1>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-1">
            <div className="flex space-x-6">
                <button 
                    onClick={() => setActiveTab('create')}
                    className={`py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'create' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <PlusCircle className="w-4 h-4" />
                    Tạo Hợp Đồng
                </button>
                <button 
                    onClick={() => setActiveTab('profiles')}
                    className={`py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'profiles' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <LayoutList className="w-4 h-4" />
                    Quản Lý Hồ Sơ
                    {isLoadingProfiles && <RefreshCw className="w-3 h-3 animate-spin text-slate-400" />}
                </button>
            </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {activeTab === 'create' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-300">
            {/* Left Column */}
            <div className="lg:col-span-4 space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <span className="bg-slate-100 text-slate-600 w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
                    File Mẫu (Template)
                </h2>
                <div className="space-y-4">
                    <FileUpload label="Mẫu Hợp Đồng" file={contractFile} onUpload={(f) => handleFileUpload(f, 'contract')} onRemove={() => setContractFile(null)} />
                    <FileUpload label="Mẫu Biên Bản Nghiệm Thu" file={acceptanceFile} onUpload={(f) => handleFileUpload(f, 'acceptance')} onRemove={() => setAcceptanceFile(null)} />
                </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sticky top-24">
                <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
                    <span className="bg-slate-100 text-slate-600 w-6 h-6 rounded-full flex items-center justify-center text-xs">3</span>
                    Xuất Tài Liệu
                </h2>
                <div className="space-y-3">
                    <button onClick={() => handleGenerate('contract')} disabled={!contractFile || !hasEnteredData} className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium py-2.5 px-4 rounded-lg transition-all shadow-sm">
                        <Download className="w-4 h-4" /> Tải Hợp Đồng (.docx)
                    </button>
                    <button onClick={() => handleGenerate('acceptance')} disabled={!acceptanceFile || !hasEnteredData} className="w-full flex items-center justify-center gap-2 bg-white border border-slate-300 hover:bg-slate-50 disabled:bg-slate-50 disabled:text-slate-300 text-slate-700 font-medium py-2.5 px-4 rounded-lg transition-all shadow-sm">
                        <Download className="w-4 h-4" /> Tải BB Nghiệm Thu (.docx)
                    </button>
                </div>
                </div>
            </div>

            {/* Right Column */}
            <div className="lg:col-span-8 space-y-6">
                {/* AI */}
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl shadow-sm border border-indigo-100 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-indigo-900 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-indigo-600" /> AI Tự Động Điền
                        </h2>
                        <button onClick={() => setShowAiInput(!showAiInput)} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium hover:underline">
                        {showAiInput ? "Ẩn công cụ" : "Mở công cụ AI"}
                        </button>
                    </div>
                    {showAiInput && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-top-4 duration-300">
                            <textarea value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} placeholder="Mô tả nội dung..." className="w-full h-32 p-3 rounded-lg border border-indigo-200 text-sm bg-white" />
                            <div className="flex justify-end">
                                <button onClick={handleAiAutoFill} disabled={isAiLoading || !aiPrompt.trim()} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
                                    <Wand2 className="w-4 h-4" /> Trích xuất dữ liệu
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Fields */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between flex-wrap gap-4">
                        <div>
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                <span className="bg-slate-100 text-slate-600 w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span> Nhập Thông Tin
                            </h2>
                        </div>
                        <div className="text-sm font-bold text-blue-600">{filledFieldsCount}/{totalFieldsCount} trường</div>
                    </div>

                    <div className="p-6">
                        {(Object.entries(groupedFields) as [string, DocField[]][]).map(([section, sectionFields]) => (
                        <div key={section} className="mb-8 last:mb-0">
                            <div className="flex items-center justify-between mb-4 border-l-4 border-blue-500 pl-3">
                                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">{getSectionTitle(section)}</h3>
                                {section === 'Party B' && savedProfiles.length > 0 && (
                                    <select onChange={(e) => handleLoadProfile(e.target.value)} defaultValue="" className="bg-white border border-slate-300 text-slate-700 py-1 px-3 rounded text-xs">
                                        <option value="" disabled>Chọn hồ sơ mẫu...</option>
                                        {savedProfiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                                {sectionFields.map((field) => (
                                    <InputField
                                        key={field.key}
                                        label={field.label}
                                        fieldKey={field.key}
                                        value={field.value}
                                        onChange={updateFieldValue}
                                        placeholder={field.placeholder}
                                        type={field.type}
                                        options={field.options}
                                        error={validationErrors[field.key]}
                                    />
                                ))}
                            </div>
                            
                            {section === 'Party B' && (
                                <div className="mt-6 pt-6 border-t border-dashed border-slate-200 space-y-6">
                                    {/* ID Card */}
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                                            <ImageIcon className="w-4 h-4 text-slate-500" /> Ảnh Căn cước công dân (CCCD)
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <FileUpload 
                                                label="Mặt Trước" 
                                                file={idCardFront} 
                                                onUpload={setIdCardFront} 
                                                onRemove={() => setIdCardFront(null)} 
                                                accept="image/*"
                                                placeholder="Click để tải ảnh mặt trước"
                                            />
                                            <FileUpload 
                                                label="Mặt Sau" 
                                                file={idCardBack} 
                                                onUpload={setIdCardBack} 
                                                onRemove={() => setIdCardBack(null)} 
                                                accept="image/*"
                                                placeholder="Click để tải ảnh mặt sau"
                                            />
                                        </div>
                                    </div>
                                    {/* Save Button */}
                                    <div className="flex justify-end">
                                        <button 
                                            onClick={handleSaveProfile} 
                                            disabled={isSavingNewProfile}
                                            className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isSavingNewProfile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                            {isSavingNewProfile ? 'Đang lưu...' : 'Lưu thông tin này thành hồ sơ mẫu (Cloud)'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                        ))}
                    </div>
                </div>
            </div>
            </div>
        )}

        {activeTab === 'profiles' && (
            <div className="animate-in fade-in duration-300">
                <ProfileListTab profiles={savedProfiles} onEdit={setEditingProfile} onDelete={handleDeleteProfile} />
            </div>
        )}
      </main>
    </div>
  );
};

export default App;
