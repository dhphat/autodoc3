
import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, LogOut, LayoutList, FileSignature, RefreshCw } from 'lucide-react';
import { supabase } from './services/supabaseClient';
import Toast from './components/Toast';
import ProfileListTab from './components/ProfileListTab';
import ProfileEditModal from './components/ProfileEditModal';
import ContractsTab from './components/ContractsTab';
import LoginPage from './components/LoginPage';
import GuestFormPage from './components/GuestFormPage';
import { DocField, DEFAULT_FIELDS, SavedProfile } from './types';
import { getProfiles, updateProfile, deleteProfile } from './services/supabaseService';
import type { User } from '@supabase/supabase-js';

type Tab = 'profiles' | 'contracts';

const App: React.FC = () => {
  // Route: /form -> Guest public form
  if (window.location.pathname === '/form') {
    return <GuestFormPage />;
  }

  return <AuthenticatedApp />;
};

const AuthenticatedApp: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) return <LoginPage />;
  return <MainApp user={user} />;
};

// ======= Main App =======
const MainApp: React.FC<{ user: User }> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<Tab>('contracts');

  // Profiles
  const [savedProfiles, setSavedProfiles] = useState<SavedProfile[]>([]);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState<SavedProfile | null>(null);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(false);

  // UI
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Banks
  const [banks, setBanks] = useState<{ shortName: string; name: string }[]>([]);
  const [fields, setFields] = useState<DocField[]>(DEFAULT_FIELDS);

  const loadProfiles = useCallback(async () => {
    setIsLoadingProfiles(true);
    try { setSavedProfiles(await getProfiles()); }
    catch (err) { console.error(err); }
    finally { setIsLoadingProfiles(false); }
  }, []);

  useEffect(() => {
    loadProfiles();
    fetch('https://api.vietqr.io/v2/banks')
      .then(res => res.json())
      .then(data => {
        if (data?.data) setBanks(data.data.map((b: any) => ({ shortName: b.shortName, name: b.name })));
      }).catch(console.error);
  }, [loadProfiles]);

  useEffect(() => {
    if (banks.length > 0) {
      setFields(prev => prev.map(f => {
        if (f.key === 'ngan_hang') {
          return { ...f, options: banks.map(b => ({ label: `${b.shortName} - ${b.name}`, value: `${b.name} (${b.shortName})` })) };
        }
        return f;
      }));
    }
  }, [banks]);

  // Open profile modal for editing
  const openEditProfile = (profile: SavedProfile) => {
    setEditingProfile(profile);
    setShowProfileModal(true);
  };

  // Open profile modal for creating
  const openCreateProfile = () => {
    setEditingProfile(null);
    setShowProfileModal(true);
  };

  const closeProfileModal = () => {
    setShowProfileModal(false);
    setEditingProfile(null);
  };

  const handleUpdateProfile = async (updatedProfile: SavedProfile): Promise<void> => {
    try {
      await updateProfile(updatedProfile);
      setSavedProfiles(prev => prev.map(p => p.id === updatedProfile.id ? updatedProfile : p));
      setToastMessage("Đã cập nhật hồ sơ!");
    } catch (error: any) {
      alert("Lỗi: " + error.message);
      throw error;
    }
  };

  const handleCreateProfile = (newProfile: SavedProfile) => {
    setSavedProfiles(prev => [newProfile, ...prev]);
    setToastMessage("Đã tạo hồ sơ mới!");
  };

  const handleDeleteProfile = async (profileId: string): Promise<void> => {
    try {
      await deleteProfile(profileId);
      setSavedProfiles(prev => prev.filter(p => p.id !== profileId));
      setToastMessage("Đã xóa hồ sơ.");
    } catch (error: any) { alert("Lỗi: " + error.message); throw error; }
  };

  const handleProfileUpdatedFromList = (updatedProfile: SavedProfile) => {
    setSavedProfiles(prev => prev.map(p => p.id === updatedProfile.id ? updatedProfile : p));
  };

  const handleLogout = async () => { await supabase.auth.signOut(); };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}

      <ProfileEditModal
        isOpen={showProfileModal}
        profile={editingProfile}
        fieldDefinitions={fields}
        onClose={closeProfileModal}
        onSave={handleUpdateProfile}
        onCreate={handleCreateProfile}
        onDelete={handleDeleteProfile}
      />

      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/favicon.png" alt="FES Contract" className="w-9 h-9 rounded-lg" />
            <h1 className="text-xl font-bold text-slate-800">FES Contract</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 hidden sm:inline">{user.email}</span>
            <button onClick={handleLogout} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-600 bg-slate-100 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors">
              <LogOut className="w-3.5 h-3.5" /> Đăng xuất
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-1">
          <div className="flex space-x-6">
            <button
              onClick={() => setActiveTab('contracts')}
              className={`py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'contracts' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              <FileSignature className="w-4 h-4" /> Hợp Đồng
            </button>
            <button
              onClick={() => setActiveTab('profiles')}
              className={`py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'profiles' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              <LayoutList className="w-4 h-4" /> Quản Lý Hồ Sơ
              {isLoadingProfiles && <RefreshCw className="w-3 h-3 animate-spin text-slate-400" />}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'contracts' && <ContractsTab profiles={savedProfiles} />}
        {activeTab === 'profiles' && (
          <div className="animate-fadeIn">
            <ProfileListTab
              profiles={savedProfiles}
              onEdit={openEditProfile}
              onProfileUpdated={handleProfileUpdatedFromList}
              onCreateNew={openCreateProfile}
            />
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
