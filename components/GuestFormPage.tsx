
import React, { useState, useEffect, useRef } from 'react';
import { FileText, Upload, Loader2, CheckCircle, Image as ImageIcon, ChevronDown } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { DEFAULT_FIELDS, DocField } from '../types';

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

  const frontRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLInputElement>(null);
  const portraitRef = useRef<HTMLInputElement>(null);

  // Profile fields (Party B section) without ten_viet_tat
  const profileFields = DEFAULT_FIELDS
    .filter(f => f.section === 'Party B' && f.key !== 'ten_viet_tat');

  // Init empty data
  useEffect(() => {
    const empty: Record<string, string> = {};
    profileFields.forEach(f => { empty[f.key] = f.value || ''; });
    setData(empty);
  }, []);

  // Load banks
  useEffect(() => {
    fetch('https://api.vietqr.io/v2/banks')
      .then(res => res.json())
      .then(d => { if (d?.data) setBanks(d.data.map((b: any) => ({ shortName: b.shortName, name: b.name }))); })
      .catch(console.error);
  }, []);

  const handleChange = (key: string, value: string) => {
    let v = value;
    if (key === 'ho_ten') v = value.toUpperCase();
    setData(prev => ({ ...prev, [key]: v }));
  };

  const handleImageSelect = (type: 'front' | 'back' | 'portrait', file: File) => {
    setImages(prev => ({ ...prev, [type]: file }));
    setImagePreviews(prev => ({ ...prev, [type]: URL.createObjectURL(file) }));
  };

  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});
  const [imageErrors, setImageErrors] = useState<{ front?: boolean; back?: boolean; portrait?: boolean }>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    const newFieldErrors: Record<string, boolean> = {};
    let missingCount = 0;
    profileFields.forEach(f => {
      if (!data[f.key]?.trim()) {
        newFieldErrors[f.key] = true;
        missingCount++;
      }
    });

    // Validate images
    const newImageErrors: { front?: boolean; back?: boolean; portrait?: boolean } = {};
    if (!images.front) { newImageErrors.front = true; missingCount++; }
    if (!images.back) { newImageErrors.back = true; missingCount++; }
    if (!images.portrait) { newImageErrors.portrait = true; missingCount++; }

    setFieldErrors(newFieldErrors);
    setImageErrors(newImageErrors);

    if (missingCount > 0) {
      setError(`Vui lòng điền đầy đủ tất cả thông tin (còn thiếu ${missingCount} mục).`);
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

  // Bank options  
  const bankOptions = banks.map(b => ({ label: `${b.shortName} - ${b.name}`, value: `${b.name} (${b.shortName})` }));

  const renderField = (field: DocField) => {
    const value = data[field.key] || '';
    const key = field.key;
    const hasError = fieldErrors[key];

    const labelCls = "block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5";
    const inputCls = `w-full border ${hasError ? 'border-red-400 bg-red-50' : 'border-slate-300 bg-white'} rounded-lg px-3.5 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400`;

    const onFieldChange = (k: string, v: string) => {
      handleChange(k, v);
      if (fieldErrors[k]) setFieldErrors(prev => ({ ...prev, [k]: false }));
    };

    if (field.type === 'select' || key === 'ngan_hang') {
      const opts = key === 'ngan_hang' ? bankOptions : (field.options || []);
      return (
        <div key={key}>
          <label className={labelCls}>{field.label} <span className="text-red-400">*</span></label>
          <div className="relative">
            <select value={value} onChange={(e) => onFieldChange(key, e.target.value)} className={`${inputCls} appearance-none pr-8`}>
              <option value="">{field.placeholder || `Chọn ${field.label}`}</option>
              {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
      );
    }

    if (field.type === 'date') {
      return (
        <div key={key}>
          <label className={labelCls}>{field.label} <span className="text-red-400">*</span></label>
          <input type="date" value={value} onChange={(e) => onFieldChange(key, e.target.value)} className={inputCls} />
        </div>
      );
    }

    return (
      <div key={key}>
        <label className={labelCls}>{field.label} <span className="text-red-400">*</span></label>
        <input type="text" value={value} onChange={(e) => onFieldChange(key, e.target.value)} placeholder={field.placeholder} className={inputCls} />
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
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">{label} <span className="text-red-400">*</span></p>
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
          <div className="bg-blue-600 p-1.5 rounded-lg"><FileText className="w-4 h-4 text-white" /></div>
          <h1 className="text-lg font-bold text-slate-800">FES Contract</h1>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          {/* Form Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6 text-white">
            <h2 className="text-xl font-bold">Đăng Ký Thông Tin Cá Nhân</h2>
            <p className="text-blue-200 text-sm mt-1">Vui lòng điền đầy đủ thông tin bên dưới</p>
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
