import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldAlert, ShieldCheck, UserPlus, Trash2, Key, Mail, User, Check, X, 
  Crown, Lock, Eye, EyeOff, ToggleLeft, ToggleRight, Sparkles, RefreshCw,
  Film, MessageSquare, TrendingUp, Sliders, AlertTriangle
} from 'lucide-react';
import { AdminUser, AdminPermission } from '../types';
import { useUI } from '../contexts/UIContext';
import { useTranslation } from '../contexts/LanguageContext';
import Portal from './Portal';

interface AdminManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  accentColor?: string;
  language?: string;
}

const DEFAULT_PERMISSIONS: AdminPermission = {
  canManageMovies: true,
  canManageSubtitles: true,
  canSendBroadcasts: true,
  canViewAnalytics: true,
  canClearSystemCache: false,
  canManageAdmins: false,
};

const MASTER_OWNER: AdminUser = {
  id: 'admin_master_001',
  email: 'flkrdstudio@gmail.com',
  username: 'FLKRD Owner (CEO)',
  role: 'owner',
  permissions: {
    canManageMovies: true,
    canManageSubtitles: true,
    canSendBroadcasts: true,
    canViewAnalytics: true,
    canClearSystemCache: true,
    canManageAdmins: true,
  },
  createdAt: '2024-01-01',
  isActive: true,
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
};

export const AdminManagementModal: React.FC<AdminManagementModalProps> = ({
  isOpen,
  onClose,
  accentColor = '#e50914',
  language = 'ku'
}) => {
  const { t } = useTranslation();
  const isKurdish = language === 'ku' || language === 'badini';

  const [admins, setAdmins] = useState<AdminUser[]>(() => {
    try {
      const stored = localStorage.getItem('flkrd_sub_admins');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return [MASTER_OWNER, ...parsed.filter((a: AdminUser) => a.email !== MASTER_OWNER.email)];
      }
    } catch (e) {}
    return [MASTER_OWNER];
  });

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAdminId, setEditingAdminId] = useState<string | null>(null);

  // Form State
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [role, setRole] = useState<'co_ceo' | 'manager' | 'editor' | 'moderator'>('manager');
  const [permissions, setPermissions] = useState<AdminPermission>(DEFAULT_PERMISSIONS);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Persist Sub-Admins
  useEffect(() => {
    try {
      const subAdminsOnly = admins.filter(a => a.id !== MASTER_OWNER.id);
      localStorage.setItem('flkrd_sub_admins', JSON.stringify(subAdminsOnly));
    } catch (e) {}
  }, [admins]);

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pass = '';
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(pass);
  };

  const handleSaveAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email.trim() || !email.includes('@')) {
      setErrorMsg(isKurdish ? 'تکایە ئیمەیڵێکی دروست بنووسە!' : 'Please enter a valid email!');
      return;
    }

    if (!username.trim()) {
      setErrorMsg(isKurdish ? 'تکایە ناوی بەکارهێنەر بنووسە!' : 'Please enter a username!');
      return;
    }

    if (!editingAdminId && (!password.trim() || password.length < 6)) {
      setErrorMsg(isKurdish ? 'تکایە پاسپۆردێک لانی کەم ٦ پیت بنووسە!' : 'Password must be at least 6 characters!');
      return;
    }

    if (editingAdminId) {
      // Update existing Sub-Admin
      setAdmins(prev => prev.map(admin => {
        if (admin.id === editingAdminId) {
          return {
            ...admin,
            email,
            username,
            role,
            permissions,
            avatarUrl: avatarUrl.trim() || admin.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username)}`,
            ...(password ? { password } : {})
          };
        }
        return admin;
      }));
      setSuccessMsg(isKurdish ? 'زانیارییەکانی ئادمن بە سەرکەوتوویی تازەکرانەوە!' : 'Admin details updated successfully!');
    } else {
      // Check duplicate email
      if (admins.some(a => a.email.toLowerCase() === email.trim().toLowerCase())) {
        setErrorMsg(isKurdish ? 'ئەم ئیمەیڵە پێشتر وەک ئادمن تۆمارکراوە!' : 'This email is already registered as Admin!');
        return;
      }

      const newAdmin: AdminUser = {
        id: `admin_sub_${Date.now()}`,
        email: email.trim().toLowerCase(),
        username: username.trim(),
        password,
        role,
        permissions,
        createdAt: new Date().toISOString().split('T')[0],
        isActive: true,
        avatarUrl: avatarUrl.trim() || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username)}`
      };

      setAdmins(prev => [...prev, newAdmin]);
      setSuccessMsg(isKurdish ? 'ئادمنی نوێ بە سەرکەوتوویی زیادکرا!' : 'New Sub-Admin created successfully!');
    }

    // Reset Form
    setEmail('');
    setUsername('');
    setPassword('');
    setAvatarUrl('');
    setPermissions(DEFAULT_PERMISSIONS);
    setEditingAdminId(null);
    setShowAddForm(false);
  };

  const handleEditAdmin = (admin: AdminUser) => {
    if (admin.id === MASTER_OWNER.id) return;
    setEditingAdminId(admin.id);
    setEmail(admin.email);
    setUsername(admin.username);
    setPassword(admin.password || '');
    setAvatarUrl(admin.avatarUrl || '');
    setRole(admin.role as any);
    setPermissions(admin.permissions);
    setShowAddForm(true);
  };

  const handleDeleteAdmin = (adminId: string) => {
    if (adminId === MASTER_OWNER.id) return;
    if (window.confirm(isKurdish ? 'دڵنیایت لە سڕینەوەی ئەم ئادمنە؟' : 'Are you sure you want to delete this Sub-Admin?')) {
      setAdmins(prev => prev.filter(a => a.id !== adminId));
    }
  };

  const handleToggleActive = (adminId: string) => {
    if (adminId === MASTER_OWNER.id) return;
    setAdmins(prev => prev.map(a => a.id === adminId ? { ...a, isActive: !a.isActive } : a));
  };

  if (!isOpen) return null;

  return (
    <Portal>
      <AnimatePresence>
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 md:p-6 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/85 backdrop-blur-xl z-0"
          />

          {/* Modal Window */}
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-4xl bg-[#09090b]/95 border border-white/10 rounded-[32px] shadow-[0_32px_90px_rgba(0,0,0,0.95)] overflow-hidden z-10 flex flex-col max-h-[90vh] pointer-events-auto"
            dir={isKurdish ? 'rtl' : 'ltr'}
          >
          {/* Header Bar */}
          <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02] shrink-0">
            <div className="flex items-center gap-3.5">
              <div 
                className="w-11 h-11 rounded-2xl flex items-center justify-center border shadow-lg"
                style={{ backgroundColor: `${accentColor}15`, borderColor: `${accentColor}30`, color: accentColor }}
              >
                <ShieldCheck size={22} className="animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                  {isKurdish ? 'بەرێوەبەرایەتی ئادمنەکان' : 'Multi-Admin & Permissions'}
                  <span className="text-[9px] px-2.5 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 font-bold uppercase">
                    PRO ROLES
                  </span>
                </h3>
                <p className="text-[10px] text-zinc-400 font-medium">
                  {isKurdish ? 'دیاریکردنی ئادمنی داهاتوو (ئادمن ٢) و بەخشینی دەسەڵاتەکان' : 'Add Co-Admins & Assign Granular Permissions'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowAddForm(prev => !prev);
                  if (showAddForm) setEditingAdminId(null);
                }}
                className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-red-600/20 active:scale-95 cursor-pointer relative z-50 pointer-events-auto"
              >
                {showAddForm ? <X size={14} /> : <UserPlus size={14} />}
                <span>{showAddForm ? (isKurdish ? 'داخستن' : 'Cancel') : (isKurdish ? 'زیادکردنی ئادمنی نوێ' : 'Add Sub-Admin')}</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white flex items-center justify-center transition-all active:scale-90 cursor-pointer relative z-50 pointer-events-auto"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
            {/* Feedback Alerts */}
            {errorMsg && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center gap-3 text-red-400 text-xs font-bold">
                <AlertTriangle size={18} className="shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-2xl flex items-center gap-3 text-green-400 text-xs font-bold">
                <Check size={18} className="shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Add / Edit Sub-Admin Form Drawer */}
            <AnimatePresence>
              {showAddForm && (
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  onSubmit={handleSaveAdmin}
                  className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 space-y-5 shadow-2xl overflow-hidden"
                >
                  <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <h4 className="text-xs font-black uppercase tracking-widest text-red-500 flex items-center gap-2">
                      <Sparkles size={14} />
                      {editingAdminId 
                        ? (isKurdish ? 'دەستکاری زانیارییەکانی ئادمن' : 'Edit Sub-Admin Profile') 
                        : (isKurdish ? 'دروستکردنی ئادمنی نوێ (ئادمن ٢)' : 'Create New Sub-Admin Account')}
                    </h4>
                    <span className="text-[10px] text-zinc-500 font-bold uppercase">
                      {isKurdish ? 'دەسەڵاتەکان دیاری بکە' : 'Configure Custom Permissions'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Username */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-zinc-400 flex items-center gap-1.5">
                        <User size={12} />
                        {isKurdish ? 'ناوی بەکارهێنەر' : 'Username / Name'}
                      </label>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="e.g. Zana Admin 2"
                        className="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-red-500 transition-colors"
                      />
                    </div>

                    {/* Email */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-zinc-400 flex items-center gap-1.5">
                        <Mail size={12} />
                        {isKurdish ? 'ئیمەیڵ' : 'Admin Email'}
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="admin2@flkrd.com"
                        className="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-red-500 transition-colors"
                      />
                    </div>

                    {/* Password */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black uppercase text-zinc-400 flex items-center gap-1.5">
                          <Key size={12} />
                          {isKurdish ? 'پاسپۆرد' : 'Password'}
                        </label>
                        <button
                          type="button"
                          onClick={generateRandomPassword}
                          className="text-[9px] text-red-400 hover:text-red-300 font-bold uppercase flex items-center gap-1"
                        >
                          <RefreshCw size={10} />
                          {isKurdish ? 'دروستکردنی خۆکار' : 'Generate'}
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder={editingAdminId ? '(وەک خۆی بهێڵەرەوە)' : '••••••••'}
                          className="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-red-500 transition-colors pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                        >
                          {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Role Selector */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-zinc-400 flex items-center gap-1.5">
                      <Crown size={12} />
                      {isKurdish ? 'پلە و ڕۆڵ لە سیستەمدا' : 'Administrative Role Tier'}
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {[
                        { id: 'co_ceo', label: isKurdish ? 'هاوبەشی بەڕێوەبەر (Co-CEO)' : 'Co-CEO / Partner' },
                        { id: 'manager', label: isKurdish ? 'بەڕێوەبەری گشتی' : 'General Manager' },
                        { id: 'editor', label: isKurdish ? 'دەستکاریکاری ناوەڕۆک' : 'Content Editor' },
                        { id: 'moderator', label: isKurdish ? 'چاودێری سیستەم' : 'System Moderator' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setRole(item.id as any)}
                          className={`p-3 rounded-2xl border text-[10px] font-black uppercase tracking-wider transition-all text-center ${
                            role === item.id 
                              ? 'bg-red-600/20 border-red-500 text-white shadow-lg shadow-red-600/10' 
                              : 'bg-black/40 border-white/10 text-zinc-400 hover:text-white hover:border-white/20'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Permission Toggles */}
                  <div className="space-y-3 pt-2 border-t border-white/5">
                    <label className="text-[10px] font-black uppercase text-red-400 flex items-center gap-1.5">
                      <Sliders size={12} />
                      {isKurdish ? 'یاسا و دەسەڵاتە دیاریکراوەکان' : 'Granular Permission Controls'}
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[
                        { key: 'canManageMovies', label: isKurdish ? 'دەستکاریکردن و بەڕێوەبردنی فیلم و زنجیرەکان' : 'Manage Movies & Series', icon: <Film size={14} /> },
                        { key: 'canManageSubtitles', label: isKurdish ? 'دەستکاریکردن و تەرجەمەکردنی ژێرنووس' : 'Manage & Translate Subtitles', icon: <Sparkles size={14} /> },
                        { key: 'canSendBroadcasts', label: isKurdish ? 'ناردنی ئاگادارکردنەوە بۆ بینەران (Broadcast)' : 'Send Live Broadcast Notifications', icon: <MessageSquare size={14} /> },
                        { key: 'canViewAnalytics', label: isKurdish ? 'بینینی ئاماری ڕاستەوخۆی بینەران (Analytics)' : 'View Live Visitor Analytics', icon: <TrendingUp size={14} /> },
                        { key: 'canClearSystemCache', label: isKurdish ? 'پاککردنەوەی کەشی سیستەم' : 'Clear System Cache & DB', icon: <Trash2 size={14} /> },
                      ].map((perm) => {
                        const isGranted = (permissions as any)[perm.key];
                        return (
                          <div
                            key={perm.key}
                            onClick={() => setPermissions(prev => ({ ...prev, [perm.key]: !isGranted }))}
                            className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                              isGranted 
                                ? 'bg-white/[0.05] border-white/20 text-white' 
                                : 'bg-black/40 border-white/5 text-zinc-500 hover:border-white/10'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <span className={isGranted ? 'text-red-500' : 'text-zinc-600'}>{perm.icon}</span>
                              <span className="text-[11px] font-bold">{perm.label}</span>
                            </div>
                            {isGranted ? <ToggleRight size={22} className="text-red-500" /> : <ToggleLeft size={22} className="text-zinc-600" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-red-600/20 active:scale-95"
                    >
                      {editingAdminId ? (isKurdish ? 'پاشەکەوتکردنی گۆڕانکارییەکان' : 'Save Changes') : (isKurdish ? 'تۆمارکردن و دروستکردنی ئادمن' : 'Create Sub-Admin Account')}
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            {/* Registered Admins List */}
            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                <Crown size={14} className="text-yellow-500" />
                {isKurdish ? 'لیستی بەرێوەبەر و ئادمنە چالاکەکان' : 'Registered System Administrators'}
                <span className="text-[10px] px-2 py-0.5 bg-white/5 border border-white/10 rounded-full text-zinc-400">
                  {admins.length} {isKurdish ? 'کەس' : 'Total'}
                </span>
              </h4>

              <div className="grid grid-cols-1 gap-3">
                {admins.map((admin) => {
                  const isOwner = admin.id === MASTER_OWNER.id;
                  return (
                    <div
                      key={admin.id}
                      className={`p-5 rounded-3xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                        isOwner 
                          ? 'bg-gradient-to-r from-yellow-500/10 via-red-600/10 to-black/60 border-yellow-500/30' 
                          : admin.isActive 
                            ? 'bg-white/[0.03] border-white/10 hover:border-white/20' 
                            : 'bg-black/60 border-white/5 opacity-60'
                      }`}
                    >
                      {/* Left Profile Info */}
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <img
                            src={admin.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${admin.username}`}
                            alt={admin.username}
                            className="w-12 h-12 rounded-2xl object-cover border border-white/15 bg-black"
                          />
                          {isOwner && (
                            <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-yellow-500 text-black flex items-center justify-center shadow-lg">
                              <Crown size={12} />
                            </div>
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <h5 className="text-sm font-black text-white">{admin.username}</h5>
                            <span className={`text-[8px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                              isOwner 
                                ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' 
                                : 'bg-red-500/10 border-red-500/30 text-red-400'
                            }`}>
                              {isOwner ? 'SUPER OWNER' : admin.role.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-400 font-medium flex items-center gap-1.5 mt-0.5">
                            <Mail size={12} className="text-zinc-500" />
                            {admin.email}
                          </p>
                        </div>
                      </div>

                      {/* Permission Badges Chips */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {admin.permissions.canManageMovies && (
                          <span className="text-[8px] font-bold px-2 py-0.5 bg-white/5 border border-white/10 rounded-lg text-zinc-300">
                            🎬 Movies
                          </span>
                        )}
                        {admin.permissions.canManageSubtitles && (
                          <span className="text-[8px] font-bold px-2 py-0.5 bg-white/5 border border-white/10 rounded-lg text-zinc-300">
                            ✨ Subtitles
                          </span>
                        )}
                        {admin.permissions.canSendBroadcasts && (
                          <span className="text-[8px] font-bold px-2 py-0.5 bg-white/5 border border-white/10 rounded-lg text-zinc-300">
                            📢 Broadcasts
                          </span>
                        )}
                        {admin.permissions.canViewAnalytics && (
                          <span className="text-[8px] font-bold px-2 py-0.5 bg-white/5 border border-white/10 rounded-lg text-zinc-300">
                            📊 Analytics
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      {!isOwner && (
                        <div className="flex items-center gap-2 self-end md:self-auto">
                          <button
                            onClick={() => handleToggleActive(admin.id)}
                            className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider border transition-all ${
                              admin.isActive 
                                ? 'bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20' 
                                : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white'
                            }`}
                          >
                            {admin.isActive ? (isKurdish ? 'چالاکە' : 'Active') : (isKurdish ? 'ناچالاک' : 'Disabled')}
                          </button>

                          <button
                            onClick={() => handleEditAdmin(admin)}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white transition-all"
                            title="Edit Permissions"
                          >
                            <Sliders size={14} />
                          </button>

                          <button
                            onClick={() => handleDeleteAdmin(admin.id)}
                            className="p-2 rounded-xl bg-red-600/10 hover:bg-red-600 border border-red-500/20 text-red-500 hover:text-white transition-all"
                            title="Delete Admin"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  </Portal>
);
};
