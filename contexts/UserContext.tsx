import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../services/supabaseClient';
import { UserProfile } from '../types';
import type { User } from '@supabase/supabase-js';

interface UserContextValue {
  user: User | null;
  userProfile: UserProfile | null;
  isAdmin: boolean;
  departmentId: string | null;
  isLoading: boolean;
  refreshProfile: () => Promise<void>;
}

const UserContext = createContext<UserContextValue>({
  user: null,
  userProfile: null,
  isAdmin: false,
  departmentId: null,
  isLoading: true,
  refreshProfile: async () => {},
});

export const useUser = () => useContext(UserContext);

export const UserProvider: React.FC<{ children: ReactNode; user: User }> = ({ children, user }) => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          *,
          department:departments(
            *,
            campus:campuses(*)
          )
        `)
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setUserProfile(data as UserProfile);
    } catch (err) {
      console.error('Failed to load user profile:', err);
      setUserProfile(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user.id]);

  const value: UserContextValue = {
    user,
    userProfile,
    isAdmin: userProfile?.role === 'admin',
    departmentId: userProfile?.department_id ?? null,
    isLoading,
    refreshProfile: fetchProfile,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

export default UserContext;
