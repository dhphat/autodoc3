import React, { useState, useMemo } from 'react';
import { X, CheckCircle2, ChevronRight, AlertTriangle, Loader2 } from 'lucide-react';
import { SavedProfile } from '../types';
import { BankData, getUniqueBanks, getBranchesByBank } from '../services/bankService';
import { updateProfile } from '../services/supabaseService';

interface BankDataConverterProps {
  isOpen: boolean;
  onClose: () => void;
  profiles: SavedProfile[];
  bankData: BankData[];
  onProfilesUpdated: (updatedProfiles: SavedProfile[]) => void;
}

const BankDataConverter: React.FC<BankDataConverterProps> = ({ isOpen, onClose, profiles, bankData, onProfilesUpdated }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updatedCount, setUpdatedCount] = useState(0);

  // Filter profiles that might need conversion
  const invalidProfiles = useMemo(() => {
    const uniqueBanks = new Set(getUniqueBanks(bankData));
    return profiles.filter(p => {
      const bank = p.data['ngan_hang'];
      const branch = p.data['chi_nhanh'];
      // Needs conversion if bank is not in our list or branch is not in the bank's branch list
      if (!bank || !uniqueBanks.has(bank)) return true;
      const validBranches = new Set(getBranchesByBank(bankData, bank));
      if (!branch || !validBranches.has(branch)) return true;
      return false;
    });
  }, [profiles, bankData]);

  const currentProfile = invalidProfiles[currentIndex];
  
  // Suggest matching bank
  const getSuggestedBank = (oldBank: string) => {
    if (!oldBank) return '';
    const uniqueBanks = getUniqueBanks(bankData);
    // Try exact match or contains
    const match = uniqueBanks.find(b => 
      b.toLowerCase().includes(oldBank.toLowerCase()) || 
      oldBank.toLowerCase().includes(b.toLowerCase())
    );
    return match || '';
  };

  const [selectedBank, setSelectedBank] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');

  // Update suggestions when currentProfile changes
  React.useEffect(() => {
    if (currentProfile) {
      const suggestion = getSuggestedBank(currentProfile.data['ngan_hang'] || '');
      setSelectedBank(suggestion);
      setSelectedBranch('');
    }
  }, [currentProfile]);

  const handleUpdate = async () => {
    if (!currentProfile) return;
    setIsUpdating(true);
    try {
      const updatedProfile: SavedProfile = {
        ...currentProfile,
        data: {
          ...currentProfile.data,
          ngan_hang: selectedBank,
          chi_nhanh: selectedBranch
        }
      };
      await updateProfile(updatedProfile);
      setUpdatedCount(prev => prev + 1);
      
      if (currentIndex < invalidProfiles.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        // Finished
        onProfilesUpdated(profiles); // This is just to trigger refresh in main app if needed
        onClose();
      }
    } catch (err: any) {
      alert('Lỗi cập nhật: ' + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSkip = () => {
    if (currentIndex < invalidProfiles.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-scaleIn">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Chuẩn hóa dữ liệu Ngân hàng</h3>
              <p className="text-xs text-slate-500">Phát hiện {invalidProfiles.length} hồ sơ cần cập nhật</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {invalidProfiles.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h4 className="text-xl font-bold text-slate-800 mb-2">Dữ liệu đã sạch!</h4>
            <p className="text-slate-500 mb-6">Tất cả hồ sơ đã sử dụng đúng danh mục ngân hàng và chi nhánh mới.</p>
            <button onClick={onClose} className="bg-slate-800 text-white px-6 py-2 rounded-lg font-medium">Đóng</button>
          </div>
        ) : (
          <div className="p-6">
            <div className="mb-6 bg-amber-50 border border-amber-200 p-4 rounded-xl flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <div className="text-sm text-amber-800">
                <p className="font-semibold mb-1">Hồ sơ {currentIndex + 1} / {invalidProfiles.length}</p>
                <p className="opacity-90">Hệ thống đối chiếu dữ liệu cũ từ API cũ và đề xuất khớp dữ liệu mới từ CSV.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 mb-8">
              {/* Old Data */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Thông tin cũ</h4>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold uppercase">Họ tên</label>
                    <p className="text-sm font-semibold text-slate-800">{currentProfile?.name}</p>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold uppercase">Ngân hàng</label>
                    <p className="text-sm text-red-600 font-medium">{currentProfile?.data['ngan_hang'] || '—'}</p>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold uppercase">Chi nhánh</label>
                    <p className="text-sm text-red-600 font-medium">{currentProfile?.data['chi_nhanh'] || '—'}</p>
                  </div>
                </div>
              </div>

              {/* New Data Selection */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Chuẩn hóa sang</h4>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Chọn Ngân hàng mới</label>
                    <select 
                      value={selectedBank}
                      onChange={(e) => { setSelectedBank(e.target.value); setSelectedBranch(''); }}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="">-- Chọn ngân hàng --</option>
                      {getUniqueBanks(bankData).map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Chọn Chi nhánh mới</label>
                    <select 
                      value={selectedBranch}
                      disabled={!selectedBank}
                      onChange={(e) => setSelectedBranch(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-50"
                    >
                      <option value="">-- Chọn chi nhánh --</option>
                      {selectedBank && getBranchesByBank(bankData, selectedBank).map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-6">
              <div className="text-sm text-slate-500 italic">
                {updatedCount > 0 && <span>Đã cập nhật {updatedCount} hồ sơ</span>}
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleSkip}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Bỏ qua
                </button>
                <button 
                  onClick={handleUpdate}
                  disabled={isUpdating || !selectedBank || !selectedBranch}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white px-6 py-2 rounded-lg font-bold transition-all shadow-md shadow-blue-500/20"
                >
                  {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Xác nhận & Sang người tiếp theo
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BankDataConverter;
