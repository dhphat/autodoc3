
import React from 'react';
import { Database, X, Copy } from 'lucide-react';

interface FirebaseGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FirebaseGuideModal: React.FC<FirebaseGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <Database className="w-4 h-4 text-orange-500" />
            Hướng dẫn kết nối Firebase (Cloud Storage)
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto space-y-4 text-sm text-slate-700">
          <p>
            Hiện tại ứng dụng đang lưu dữ liệu trên trình duyệt (Local Storage). Để đồng bộ dữ liệu giữa nhiều thiết bị, bạn cần kết nối với Firebase.
          </p>
          
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
            <h4 className="font-bold text-slate-900">Bước 1: Tạo Project Firebase</h4>
            <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Truy cập <a href="https://console.firebase.google.com/" target="_blank" className="text-blue-600 underline">Firebase Console</a>.</li>
                <li>Tạo một dự án mới.</li>
                <li>Vào mục <strong>Firestore Database</strong> và chọn "Create database".</li>
                <li>Vào mục <strong>Project Settings</strong> (biểu tượng bánh răng) {'>'} General.</li>
                <li>Cuộn xuống mục "Your apps" và chọn biểu tượng Web ({'</>'}).</li>
                <li>Copy đoạn config (apiKey, authDomain, projectId,...).</li>
            </ol>
          </div>

          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
             <h4 className="font-bold text-slate-900">Bước 2: Cập nhật mã nguồn</h4>
             <p>Mở file <code>services/firebaseService.ts</code> và dán config của bạn vào:</p>
             <div className="bg-slate-900 text-slate-300 p-3 rounded font-mono text-xs overflow-x-auto">
{`const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "...",
  appId: "..."
};`}
             </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
            <button onClick={onClose} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
                Đã hiểu
            </button>
        </div>
      </div>
    </div>
  );
};

export default FirebaseGuideModal;
