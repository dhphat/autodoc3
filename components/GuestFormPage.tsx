
import React, { useState, useEffect, useRef } from 'react';
import { FileText, Upload, Loader2, CheckCircle, Image as ImageIcon, ChevronDown } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { DEFAULT_FIELDS, DocField } from '../types';
import { validateField } from '../utils/validation';

// Compress image before upload
const compressImage = (file: File, maxWidth = 600, quality = 0.6): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width, height = img.height;
        if (width > maxWidth) { height = (height * maxWidth) / width; width = maxWidth; }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error('Compression failed'))),
          'image/jpeg', quality
        );
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
};

const genAbbr = (name: string) => name.trim().split(/\s+/).map(w => w.charAt(0).toUpperCase()).join('');

const GuestFormPage: React.FC = () => {
  const [data, setData] = useState<Record<string, string>>({});
  const [images, setImages] = useState<{ front?: File; back?: File; portrait?: File }>({});
  const [imagePreviews, setImagePreviews] = useState<{ front?: string; back?: string; portrait?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [banks, setBanks] = useState<{ shortName: string; name: string }[]>([]);
  const [bankQuery, setBankQuery] = useState('');
  const [isBankOpen, setIsBankOpen] = useState(false);
  const bankRef = useRef<HTMLDivElement>(null);

  const frontRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLInputElement>(null);
  const portraitRef = useRef<HTMLInputElement>(null);

  // Profile fields (Party B section) without ten_viet_tat
  const profileFields = DEFAULT_FIELDS
    .filter(f => f.section === 'Party B' && f.key !== 'ten_viet_tat');

  const dataRef = useRef<Record<string, string>>({});

  // Init empty data
  useEffect(() => {
    const empty: Record<string, string> = {};
    profileFields.forEach(f => { empty[f.key] = f.value || ''; });
    setData(empty);
    dataRef.current = empty;
  }, []);

  // Load banks
  useEffect(() => {
    fetch('https://api.vietqr.io/v2/banks')
      .then(res => res.json())
      .then(d => { if (d?.data) setBanks(d.data.map((b: any) => ({ shortName: b.shortName, name: b.name }))); })
      .catch(console.error);
  }, []);

  // Sync bank search query with selection
  useEffect(() => {
    const selectedBank = data['ngan_hang'];
    if (selectedBank) {
      const match = banks.find(b => `${b.name} (${b.shortName})` === selectedBank);
      if (match) setBankQuery(`${match.shortName} - ${match.name}`);
    } else {
      setBankQuery('');
    }
  }, [data['ngan_hang'], banks]);

  // Click outside to close bank dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (bankRef.current && !bankRef.current.contains(event.target as Node)) {
        setIsBankOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleChange = (key: string, value: string) => {
    let v = value;
    if (key === 'ho_ten') v = value.toUpperCase();
    setData(prev => {
      const next = { ...prev, [key]: v };
      dataRef.current = next;
      return next;
    });
  };

  const handleImageSelect = (type: 'front' | 'back' | 'portrait', file: File) => {
    setImages(prev => ({ ...prev, [type]: file }));
    setImagePreviews(prev => ({ ...prev, [type]: URL.createObjectURL(file) }));
  };

  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
  const [imageErrors, setImageErrors] = useState<{ front?: boolean; back?: boolean; portrait?: boolean }>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    const newFieldErrors: Record<string, string | undefined> = {};
    let missingOrInvalidCount = 0;
    
    profileFields.forEach(f => {
      const val = data[f.key]?.trim() || '';
      if (!val) {
        newFieldErrors[f.key] = 'Bắt buộc';
        missingOrInvalidCount++;
      } else {
        const validationMsg = validateField(f.key, val);
        if (validationMsg) {
          newFieldErrors[f.key] = validationMsg;
          missingOrInvalidCount++;
        }
      }
    });

    // Validate images
    const newImageErrors: { front?: boolean; back?: boolean; portrait?: boolean } = {};
    if (!images.front) { newImageErrors.front = true; missingOrInvalidCount++; }
    if (!images.back) { newImageErrors.back = true; missingOrInvalidCount++; }
    if (!images.portrait) { newImageErrors.portrait = true; missingOrInvalidCount++; }

    setFieldErrors(newFieldErrors);
    setImageErrors(newImageErrors);

    if (missingOrInvalidCount > 0) {
      setError(`Vui lòng kiểm tra lại thông tin (còn ${missingOrInvalidCount} mục trống hoặc không hợp lệ).`);
      // Scroll to first error
      const firstError = document.querySelector('.border-red-400');
      firstError?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const hoTen = data['ho_ten'];
      const tenVietTat = genAbbr(hoTen);
      const finalData: Record<string, string> = { ...data, ten_viet_tat: tenVietTat };
      const tempId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

      // Upload images
      let frontUrl: string | null = null;
      let backUrl: string | null = null;
      let portraitUrl: string | null = null;

      const uploadImg = async (file: File, type: string) => {
        const compressed = await compressImage(file);
        const path = `guest/${tempId}/${type}_${Date.now()}.jpg`;
        const { error } = await supabase.storage.from('cccd-images').upload(path, compressed, { contentType: 'image/jpeg' });
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from('cccd-images').getPublicUrl(path);
        return publicUrl;
      };

      if (images.front) frontUrl = await uploadImg(images.front, 'front');
      if (images.back) backUrl = await uploadImg(images.back, 'back');
      if (images.portrait) portraitUrl = await uploadImg(images.portrait, 'portrait');

      // Create profile (guest — no user_id)
      const { error: insertError } = await supabase.from('profiles').insert({
        name: hoTen,
        data: finalData,
        id_card_front_url: frontUrl,
        id_card_back_url: backUrl,
        id_card_portrait_url: portraitUrl,
      });

      if (insertError) throw insertError;
      setIsSuccess(true);
    } catch (err: any) {
      setError('Lỗi gửi thông tin: ' + (err.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderField = (field: DocField) => {
    const value = data[field.key] || '';
    const key = field.key;
    const errorMsg = fieldErrors[key];

    const labelCls = "block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5";
    const inputCls = `w-full border ${errorMsg ? 'border-red-400 bg-red-50' : 'border-slate-300 bg-white'} rounded-lg px-3.5 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400`;

    const onFieldChange = (k: string, v: string) => {
      handleChange(k, v);
      if (fieldErrors[k]) setFieldErrors(prev => ({ ...prev, [k]: undefined }));
    };

    const onFieldBlur = (k: string) => {
      const val = (dataRef.current[k] || '').trim();
      if (!val) {
        setFieldErrors(prev => ({ ...prev, [k]: 'Bắt buộc' }));
      } else {
        const msg = validateField(k, val);
        setFieldErrors(prev => ({ ...prev, [k]: msg }));
      }
    };

    const renderError = () => errorMsg && (
      <p className="text-[10px] text-red-500 mt-1 font-medium italic animate-fadeIn">{errorMsg}</p>
    );

    // Searchable Bank Selector
    if (key === 'ngan_hang') {
      const filteredBanks = banks.filter(b => 
        b.shortName.toLowerCase().includes(bankQuery.toLowerCase()) || 
        b.name.toLowerCase().includes(bankQuery.toLowerCase())
      );

      return (
        <div key={key} ref={bankRef}>
          <label className={labelCls}>{field.label} <span className="text-red-400">*</span></label>
          <div className="relative">
            <input
              type="text"
              value={bankQuery}
              onChange={(e) => {
                setBankQuery(e.target.value);
                setIsBankOpen(true);
                // We clear the selection if search is modified manually
                if (data[key]) handleChange(key, ''); 
              }}
              onFocus={() => setIsBankOpen(true)}
              onBlur={() => {
                // Delayed validation to allow for list item selection
                setTimeout(() => onFieldBlur(key), 200);
              }}
              placeholder={field.placeholder || 'Tìm kiếm ngân hàng...'}
              className={`${inputCls} pr-8`}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isBankOpen ? 'rotate-180' : ''}`} />
            </div>

            {isBankOpen && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto animate-fadeIn">
                {filteredBanks.length > 0 ? (
                  filteredBanks.map(b => (
                    <div
                      key={b.shortName}
                      className="px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 text-slate-700 border-b border-slate-50 last:border-0"
                      onClick={() => {
                        const val = `${b.name} (${b.shortName})`;
                        onFieldChange(key, val);
                        setBankQuery(`${b.shortName} - ${b.name}`);
                        setIsBankOpen(false);
                      }}
                    >
                      <div className="font-semibold text-xs text-blue-700">{b.shortName}</div>
                      <div className="text-[11px] text-slate-500 truncate">{b.name}</div>
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-3 text-sm text-slate-400 text-center">Không tìm thấy kết quả</div>
                )}
              </div>
            )}
          </div>
          {renderError()}
        </div>
      );
    }

    if (field.type === 'select') {
      const opts = field.options || [];
      return (
        <div key={key}>
          <label className={labelCls}>{field.label} <span className="text-red-400">*</span></label>
          <div className="relative">
            <select 
              value={value} 
              onChange={(e) => onFieldChange(key, e.target.value)} 
              onBlur={() => onFieldBlur(key)}
              className={`${inputCls} appearance-none pr-8`}
            >
              <option value="">{field.placeholder || `Chọn ${field.label}`}</option>
              {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
          {renderError()}
        </div>
      );
    }

    if (field.type === 'date') {
      return (
        <div key={key}>
          <label className={labelCls}>{field.label} <span className="text-red-400">*</span></label>
          <input 
            type="text" 
            inputMode="numeric"
            value={value} 
            onChange={(e) => {
              let val = e.target.value.replace(/[^\d]/g, '');
              if (val.length > 2 && val.length <= 4) val = val.slice(0, 2) + '/' + val.slice(2);
              else if (val.length > 4) val = val.slice(0, 2) + '/' + val.slice(2, 4) + '/' + val.slice(4, 8);
              onFieldChange(key, val);
            }} 
            onBlur={() => onFieldBlur(key)}
            placeholder="DD/MM/YYYY" 
            maxLength={10}
            className={inputCls} 
          />
          {renderError()}
        </div>
      );
    }

    return (
      <div key={key}>
        <label className={labelCls}>{field.label} <span className="text-red-400">*</span></label>
        <input 
          type="text" 
          value={value} 
          onChange={(e) => onFieldChange(key, e.target.value)} 
          onBlur={() => onFieldBlur(key)}
          placeholder={field.placeholder} 
          className={inputCls} 
        />
        {renderError()}
      </div>
    );
  };

  const renderImageUpload = (type: 'front' | 'back' | 'portrait', label: string, ref: React.RefObject<HTMLInputElement>) => {
    const preview = imagePreviews[type];
    const hasError = imageErrors[type];

    const onSelect = (file: File) => {
      handleImageSelect(type, file);
      if (imageErrors[type]) setImageErrors(prev => ({ ...prev, [type]: false }));
    };

    return (
      <div className="text-center">
        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-2">{label} <span className="text-red-400">*</span></p>
        <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onSelect(e.target.files[0])} />
        <button type="button" onClick={() => ref.current?.click()}
          className={`w-full aspect-[4/3] rounded-xl border-2 border-dashed flex flex-col items-center justify-center overflow-hidden transition-all ${preview ? 'border-green-300 bg-green-50' : hasError ? 'border-red-400 bg-red-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-blue-400'}`}>
          {preview ? (
            <img src={preview} alt={label} className="w-full h-full object-contain" />
          ) : (
            <>
              <ImageIcon className={`w-8 h-8 ${hasError ? 'text-red-400' : 'text-slate-400'} mb-1`} />
              <span className={`text-xs ${hasError ? 'text-red-500' : 'text-slate-500'}`}>{hasError ? 'Bắt buộc' : 'Chọn ảnh'}</span>
            </>
          )}
        </button>
        {preview && <p className="text-xs text-green-600 mt-1">✓ Đã chọn</p>}
      </div>
    );
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md text-center animate-fadeIn">
          <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Gửi thành công!</h2>
          <p className="text-slate-500 mb-6">Thông tin của bạn đã được ghi nhận. Cảm ơn bạn đã hợp tác!</p>
          <button onClick={() => window.location.reload()} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm">
            Gửi hồ sơ khác
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-2.5">
          <img src="/favicon.png" alt="FES Contract" className="w-8 h-8 rounded-lg" />
          <h1 className="text-lg font-bold text-slate-800">FES Contract</h1>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          {/* Form Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6 text-white">
            <h2 className="text-xl font-bold">Nhập thông tin cá nhân</h2>
            <p className="text-blue-200 text-sm mt-1">Để phục vụ quá trình lập hồ sơ thanh toán, vui lòng điền đầy đủ thông tin bên dưới</p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {/* Personal Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              {profileFields.map(f => renderField(f))}
            </div>

            {/* CCCD Images */}
            <div>
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-blue-600" />
                Ảnh Căn cước công dân (CCCD) & VNeID
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {renderImageUpload('front', 'Mặt Trước', frontRef as React.RefObject<HTMLInputElement>)}
                {renderImageUpload('back', 'Mặt Sau', backRef as React.RefObject<HTMLInputElement>)}
                {renderImageUpload('portrait', 'Ảnh VNeID', portraitRef as React.RefObject<HTMLInputElement>)}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg animate-fadeIn">
                {error}
              </div>
            )}

            {/* Submit */}
            <div className="pt-2">
              <button type="submit" disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-blue-400 disabled:to-indigo-400 text-white py-3 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2">
                {isSubmitting ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Đang gửi...</>
                ) : (
                  <><Upload className="w-5 h-5" /> Gửi thông tin</>
                )}
              </button>
            </div>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          © FES Contract — Thông tin sẽ được xử lý bảo mật
        </p>
      </div>
    </div>
  );
};

export default GuestFormPage;
