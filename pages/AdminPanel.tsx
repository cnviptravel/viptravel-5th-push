import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGetAllUsers, apiDeleteUser, apiUpdateUserStatus, apiUploadMedia } from '../services/api';
import { User, UserRole } from '../types';
// Config ашиглах
import { useAppConfig } from '../contexts/AppConfigContext';
import { useSnackbar } from '../contexts/SnackbarContext';
import ConfirmModal from '../components/ConfirmModal';
import AdminDashboard from './AdminDashboard';
import AdminServiceLog from './AdminServiceLog';
import AdminApiCosts from './AdminApiCosts';

const AdminPanel: React.FC = () => {
    const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();
    
    // Config Context дуудах
    const { config, updateConfig } = useAppConfig();
    
    const [users, setUsers] = useState<User[]>([]);
    const [tab, setTab] = useState<'pending' | 'all' | 'branding' | 'dashboard' | 'servicelog' | 'apicosts'>('dashboard');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [confirmDeleteUser, setConfirmDeleteUser] = useState<string | null>(null);

    // Branding Edit States
    const [editAppName, setEditAppName] = useState(config.appName);
    const [uploading, setUploading] = useState(false);

    const loadUsers = async () => {
        const allUsers = await apiGetAllUsers();
        setUsers(allUsers);
    };

    useEffect(() => {
        loadUsers();
    }, []);

    // Config өөрчлөгдөхөд state шинэчлэх
    useEffect(() => {
        setEditAppName(config.appName);
    }, [config.appName]);

    const handleApprove = async (userId: string) => {
        try {
            await apiUpdateUserStatus(userId, 'approved');
            await loadUsers();
            setSelectedUser(null);
            showSnackbar("User approved successfully.", 'success');
        } catch {
            showSnackbar("Failed to approve user.", 'error');
        }
    };

    const handleReject = async (userId: string) => {
        try {
            await apiUpdateUserStatus(userId, 'rejected');
            await loadUsers();
            setSelectedUser(null);
            showSnackbar("User rejected.", 'info');
        } catch {
            showSnackbar("Failed to reject user.", 'error');
        }
    };

    const handleDelete = (userId: string) => {
        setConfirmDeleteUser(userId);
    };

    const handleDeleteConfirmed = async () => {
        if (!confirmDeleteUser) return;
        try {
            await apiDeleteUser(confirmDeleteUser);
            await loadUsers();
            showSnackbar("User deleted.", 'success');
        } catch {
            showSnackbar("Failed to delete user.", 'error');
        } finally {
            setConfirmDeleteUser(null);
        }
    };

    // --- BRANDING SAVE FUNCTIONS ---

    // 1. Аппын Нэр (Текст) хадгалах
    const handleSaveAppName = async () => {
        await updateConfig({ ...config, appName: editAppName });
        showSnackbar("App Name Updated!", 'success');
    };

    // 2. Global Icon (Жижиг лого) оруулах
    const handleGlobalIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            setUploading(true);
            try {
                const url = await apiUploadMedia(e.target.files[0]);
                await updateConfig({ ...config, logoUrl: url });
                showSnackbar("Global Icon Updated!", 'success');
            } catch (err) {
                showSnackbar("Upload failed", 'error');
            } finally { setUploading(false); }
        }
    };

    // 3. LOGIN PAGE LOGO (Том лого) оруулах
    const handleLoginLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            setUploading(true);
            try {
                const url = await apiUploadMedia(e.target.files[0]);
                await updateConfig({ ...config, loginLogoUrl: url });
                showSnackbar("Login Page Logo Updated!", 'success');
            } catch (err) {
                showSnackbar("Upload failed", 'error');
            } finally { setUploading(false); }
        }
    };

    // 4. LOGIN PAGE NAME IMAGE (Нэрний зураг) оруулах
    const handleLoginNameImgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            setUploading(true);
            try {
                const url = await apiUploadMedia(e.target.files[0]);
                await updateConfig({ ...config, loginNameImageUrl: url });
                showSnackbar("Login Name Image Updated!", 'success');
            } catch (err) {
                showSnackbar("Upload failed", 'error');
            } finally { setUploading(false); }
        }
    };

    const pendingUsers = users.filter(u => u.status === 'pending');
    const allUsers = users.filter(u => u.role !== UserRole.Admin);

    return (
        <div className="p-4 pb-24">
            <h1 className="text-2xl font-bold dark:text-white mb-6">Admin Panel</h1>

            <div className="flex gap-4 mb-6 border-b border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar">
                <button onClick={() => setTab('dashboard')}
                  className={`pb-2 font-bold text-sm whitespace-nowrap ${tab==='dashboard'?'text-primary border-b-2 border-primary':'text-slate-400'}`}>
                  Dashboard
                </button>
                <button onClick={() => setTab('servicelog')}
                  className={`pb-2 font-bold text-sm whitespace-nowrap ${tab==='servicelog'?'text-primary border-b-2 border-primary':'text-slate-400'}`}>
                  Тооцоо
                </button>
                <button onClick={() => setTab('apicosts')}
                  className={`pb-2 font-bold text-sm whitespace-nowrap ${tab==='apicosts'?'text-primary border-b-2 border-primary':'text-slate-400'}`}>
                  API Зардал
                </button>
                <button 
                    onClick={() => setTab('pending')}
                    className={`pb-2 font-bold text-sm whitespace-nowrap ${tab === 'pending' ? 'text-primary border-b-2 border-primary' : 'text-slate-400'}`}
                >
                    Pending ({pendingUsers.length})
                </button>
                <button 
                    onClick={() => setTab('all')}
                    className={`pb-2 font-bold text-sm whitespace-nowrap ${tab === 'all' ? 'text-primary border-b-2 border-primary' : 'text-slate-400'}`}
                >
                    All Users ({allUsers.length})
                </button>
                {/* BRANDING TAB */}
                <button 
                    onClick={() => setTab('branding')}
                    className={`pb-2 font-bold text-sm whitespace-nowrap ${tab === 'branding' ? 'text-primary border-b-2 border-primary' : 'text-slate-400'}`}
                >
                    App Branding
                </button>
            </div>

            <div className="space-y-4">
                {/* --- TAB: PENDING --- */}
                {tab === 'pending' && (
                    <>
                        {pendingUsers.length === 0 ? (
                            <p className="text-slate-500 text-center py-10">No pending approvals.</p>
                        ) : (
                            pendingUsers.map(user => (
                                <div key={user._id} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                    <div className="flex items-center gap-3 mb-3">
                                        <img 
                                            src={user.profilePic || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png'} 
                                            className="w-12 h-12 rounded-full object-cover cursor-pointer" 
                                            alt={user.name} 
                                            onClick={() => navigate(`/profile/${user._id}`)}
                                        />
                                        <div>
                                            <h3 
                                                className="font-bold dark:text-white cursor-pointer hover:text-primary"
                                                onClick={() => navigate(`/profile/${user._id}`)}
                                            >
                                                {user.name}
                                            </h3>
                                            <p className="text-xs text-slate-500">{user.email}</p>
                                            <div className="flex gap-2 mt-1 flex-wrap">
                                                <span className="text-[10px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded uppercase font-bold">{user.role}</span>
                                                <button 
                                                    onClick={() => navigate(`/profile/${user._id}`)}
                                                    className="text-[10px] text-primary font-bold hover:underline flex items-center gap-1"
                                                >
                                                    View Profile <span className="material-symbols-outlined text-[10px]">arrow_outward</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Self-Verification Status (Email/Phone) */}
                                    <div className="mb-3 bg-slate-50 dark:bg-slate-800 rounded-xl p-3 space-y-2">
                                        <p className="text-[10px] font-extrabold text-slate-400 uppercase">Self-Verification</p>
                                        <div className="flex gap-3">
                                            <div className={`flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-lg ${user.isEmailVerified ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500'}`}>
                                                <span className="material-symbols-outlined text-sm">{user.isEmailVerified ? 'check_circle' : 'cancel'}</span>
                                                Email
                                            </div>
                                            <div className={`flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-lg ${user.isPhoneVerified ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500'}`}>
                                                <span className="material-symbols-outlined text-sm">{user.isPhoneVerified ? 'check_circle' : 'cancel'}</span>
                                                Phone
                                            </div>
                                        </div>
                                        {user.phone && <p className="text-[10px] text-slate-500">Phone: {user.phone}</p>}
                                        
                                        {/* Note for provider/guide */}
                                        {(user.role === 'guide' || user.role === 'provider') && (
                                            <p className="text-[10px] text-orange-500 font-bold mt-1">
                                                ⚠️ Provider/Guide requires manual admin approval regardless of self-verification
                                            </p>
                                        )}
                                    </div>

                                    {/* Documents */}
                                    <div className="mb-3 text-sm">
                                        <p className="text-slate-500">Documents Submitted: {user.verificationData ? 'Yes' : 'No'}</p>
                                        {(user.verificationData || (user.examResults && user.examResults.length > 0)) && (
                                            <button 
                                                onClick={() => setSelectedUser(user)}
                                                className="text-primary font-bold underline text-xs"
                                            >
                                                View Verification Details
                                            </button>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <button onClick={() => handleApprove(user._id)} className="bg-green-500 text-white font-bold py-2 rounded-lg text-sm">Approve</button>
                                        <button onClick={() => handleReject(user._id)} className="bg-red-500 text-white font-bold py-2 rounded-lg text-sm">Reject</button>
                                    </div>
                                </div>
                            ))
                        )}
                    </>
                )}

                {/* --- TAB: ALL USERS --- */}
                {tab === 'all' && (
                    <>
                         {allUsers.map(user => (
                            <div key={user._id} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <img 
                                        src={user.profilePic || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png'} 
                                        className="w-10 h-10 rounded-full object-cover cursor-pointer" 
                                        alt={user.name}
                                        onClick={() => navigate(`/profile/${user._id}`)} 
                                    />
                                    <div>
                                        <h3 
                                            className="font-bold text-sm dark:text-white cursor-pointer hover:text-primary"
                                            onClick={() => navigate(`/profile/${user._id}`)}
                                        >
                                            {user.name}
                                        </h3>
                                        <p className="text-[10px] text-slate-500 uppercase">{user.role} • {user.status}</p>
                                    </div>
                                </div>
                                <button onClick={() => handleDelete(user._id)} className="text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded-full">
                                    <span className="material-symbols-outlined text-lg">delete</span>
                                </button>
                            </div>
                        ))}
                    </>
                )}

                {/* --- TAB: APP BRANDING (ШИНЭЧЛЭГДСЭН) --- */}
                {tab === 'branding' && (
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-8">
                        
                        {/* SECTION 1: GLOBAL SETTINGS */}
                        <div className="border-b border-slate-100 dark:border-slate-800 pb-6">
                            <h3 className="font-bold text-lg dark:text-white mb-4 text-primary">1. Global Settings (Header)</h3>
                            
                            {/* App Name (Text) */}
                            <div className="mb-4">
                                <label className="block text-xs font-extrabold text-slate-400 uppercase mb-2">App Name (Text)</label>
                                <div className="flex gap-2">
                                    <input 
                                        value={editAppName}
                                        onChange={(e) => setEditAppName(e.target.value)}
                                        className="flex-1 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border-none outline-none dark:text-white"
                                    />
                                    <button onClick={handleSaveAppName} className="bg-slate-800 text-white font-bold px-4 rounded-xl text-sm">Save</button>
                                </div>
                            </div>

                            {/* Global Icon */}
                            <div>
                                <label className="block text-xs font-extrabold text-slate-400 uppercase mb-2">Global Icon (Small)</label>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 flex items-center justify-center p-2">
                                        {config.logoUrl ? <img src={config.logoUrl} className="w-full h-full object-contain" /> : <span className="material-symbols-outlined text-slate-300">image</span>}
                                    </div>
                                    <label className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer px-4 py-2 rounded-xl font-bold text-sm">
                                        {uploading ? 'Uploading...' : 'Change Icon'}
                                        <input type="file" className="hidden" accept="image/*" onChange={handleGlobalIconUpload} />
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* SECTION 2: LOGIN PAGE SETTINGS */}
                        <div>
                            <h3 className="font-bold text-lg dark:text-white mb-4 text-primary">2. Login Page Branding</h3>
                            
                            {/* Login Logo */}
                            <div className="mb-6">
                                <label className="block text-xs font-extrabold text-slate-400 uppercase mb-2">Login Logo (Big)</label>
                                <div className="flex items-center gap-4">
                                    <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 flex items-center justify-center p-2">
                                        {config.loginLogoUrl ? <img src={config.loginLogoUrl} className="w-full h-full object-contain" /> : <span className="material-symbols-outlined text-slate-300 text-2xl">image</span>}
                                    </div>
                                    <label className="bg-primary text-white hover:bg-blue-700 cursor-pointer px-4 py-2 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20">
                                        {uploading ? 'Uploading...' : 'Upload Login Logo'}
                                        <input type="file" className="hidden" accept="image/*" onChange={handleLoginLogoUpload} />
                                    </label>
                                </div>
                            </div>

                            {/* Login Name Image */}
                            <div>
                                <label className="block text-xs font-extrabold text-slate-400 uppercase mb-2">Login Name Image (Horizontal)</label>
                                <div className="flex flex-col gap-3">
                                    <div className="h-16 w-full max-w-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 flex items-center justify-center p-2 border-dashed">
                                        {config.loginNameImageUrl ? <img src={config.loginNameImageUrl} className="h-full object-contain" /> : <span className="text-slate-400 text-xs font-bold">No Image</span>}
                                    </div>
                                    <label className="bg-primary text-white hover:bg-blue-700 cursor-pointer px-4 py-2 rounded-xl font-bold text-sm w-max shadow-lg shadow-blue-500/20">
                                        {uploading ? 'Uploading...' : 'Upload Name Image'}
                                        <input type="file" className="hidden" accept="image/*" onChange={handleLoginNameImgUpload} />
                                    </label>
                                </div>
                            </div>
                        </div>

                    </div>
                )}
                {tab === 'dashboard' && <AdminDashboard />}
                {tab === 'servicelog' && <AdminServiceLog />}
                {tab === 'apicosts' && <AdminApiCosts />}
            </div>

            {/* Document Viewer Modal */}
            {selectedUser && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center sticky top-0 bg-white dark:bg-slate-900 z-10">
                            <h3 className="font-bold text-lg dark:text-white">Verification Docs: {selectedUser.name}</h3>
                            <button onClick={() => setSelectedUser(null)}><span className="material-symbols-outlined">close</span></button>
                        </div>
                        <div className="p-6 space-y-6">
                            {/* Exam Results Section */}
                            {selectedUser.examResults && selectedUser.examResults.length > 0 && (
                                <div className="mb-6 border-b border-slate-100 dark:border-slate-800 pb-6">
                                    <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-3">Language Exam Results</h4>
                                    <div className="space-y-2">
                                        {selectedUser.examResults.map((result, i) => (
                                            <div key={i} className="flex justify-between items-center bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                                                <span className="font-bold dark:text-white">{result.language}</span>
                                                <span className={`text-xs font-bold px-2 py-1 rounded ${result.status === 'passed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                    {result.score}/10 ({result.status.toUpperCase()})
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {selectedUser.verificationData?.documentImage && (
                                <div>
                                    <p className="font-bold text-sm mb-2 dark:text-slate-300">Government ID / Passport</p>
                                    <img src={selectedUser.verificationData.documentImage} className="w-full rounded-lg border dark:border-slate-700" alt="ID" />
                                </div>
                            )}
                            {selectedUser.verificationData?.certificateImage && (
                                <div>
                                    <p className="font-bold text-sm mb-2 dark:text-slate-300">Certificate / License</p>
                                    <img src={selectedUser.verificationData.certificateImage} className="w-full rounded-lg border dark:border-slate-700" alt="Cert" />
                                </div>
                            )}
                            {!selectedUser.verificationData && (!selectedUser.examResults || selectedUser.examResults.length === 0) && <p>No documents or exam results submitted.</p>}

                            <div className="flex gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <button 
                                    onClick={() => handleApprove(selectedUser._id)}
                                    className="flex-1 bg-green-500 text-white font-bold py-3 rounded-xl"
                                >
                                    Approve User
                                </button>
                                <button 
                                    onClick={() => handleReject(selectedUser._id)}
                                    className="flex-1 bg-red-500 text-white font-bold py-3 rounded-xl"
                                >
                                    Reject User
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm Delete User Modal */}
            <ConfirmModal
                open={confirmDeleteUser !== null}
                title="Delete User"
                message="Are you sure you want to delete this user and all their data? This cannot be undone."
                confirmLabel="Delete"
                cancelLabel="Cancel"
                danger
                onConfirm={handleDeleteConfirmed}
                onCancel={() => setConfirmDeleteUser(null)}
            />
        </div>
    );
};

export default AdminPanel;
