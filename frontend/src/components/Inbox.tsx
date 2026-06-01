'use client';

import React, { useState, useEffect } from 'react';
import { Mail, MailOpen, Trash2, Info, Megaphone, RefreshCw, Sparkles, User, Send, FileText, CheckCircle2, ChevronRight, X, AlertTriangle, Search } from 'lucide-react';
import { supabase, isMockDatabase } from '@/lib/supabase';
import { useApp } from '@/lib/ThemeProvider';

interface InboxProps {
  adminRole?: 'super_admin' | 'editor' | null;
  onUnreadCountChange?: (count: number) => void;
}

interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  content: string;
  type: 'system' | 'announcement' | 'update' | 'bonus' | 'agent_status';
  is_read: boolean;
  created_at: string;
}

interface UserDirectoryItem {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'agent' | 'super_admin';
  phone?: string;
  whatsapp?: string;
}

export default function Inbox({ adminRole, onUnreadCountChange }: InboxProps) {
  const { lang } = useApp();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [authUserId, setAuthUserId] = useState<string>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  
  // Super Admin state
  const [usersDirectory, setUsersDirectory] = useState<UserDirectoryItem[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<{ id: string; name: string; email: string } | null>(null);
  const [recipientScope, setRecipientScope] = useState<'all_students' | 'all_agents' | 'all_users' | 'specific'>('all_students');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [newTitle, setNewTitle] = useState<string>('');
  const [newContent, setNewContent] = useState<string>('');
  const [newType, setNewType] = useState<'system' | 'announcement' | 'update' | 'bonus' | 'agent_status'>('announcement');
  const [sending, setSending] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; success: boolean } | null>(null);

  // Translations
  const t = {
    zh: {
      inboxTitle: '收件箱',
      inboxSubtitle: '查看您接收到的公告、系统通知与福利活动',
      sendTitle: '发送公告与通知',
      sendSubtitle: '作为超级管理员，向平台用户群发或单发消息',
      typeAll: '全部消息',
      typeUnread: '未读消息',
      typeSystem: '系统通知',
      typeAnnouncement: '平台公告',
      typeUpdate: '版本更新',
      typeBonus: '福利活动',
      noMessages: '暂无消息记录',
      markAllRead: '一键已读',
      deleteMsg: '删除消息',
      timeAgo: '发送于',
      recipientLabel: '接收对象',
      recipientAllStudents: '所有学生/租客',
      recipientAllAgents: '所有中介/管理员',
      recipientAllUsers: '所有用户 (全员)',
      recipientSpecific: '指定单个用户',
      searchPlaceholder: '搜索用户姓名或邮箱...',
      titleLabel: '消息标题',
      titlePlaceholder: '请输入消息标题...',
      contentLabel: '消息内容',
      contentPlaceholder: '请输入通知的详细内容...',
      msgTypeLabel: '消息类型',
      sendBtn: '发送通知',
      sendingBtn: '正在发送...',
      templateLabel: '选择预设模板',
      templateNone: '自定义内容 (无模板)',
      templateApproveTitle: '中介审核通过通知',
      templateRejectTitle: '中介审核拒绝通知',
      templateMaintainTitle: '系统维护停机公告',
      templatePromoTitle: '新挂牌首月佣金折扣福利',
      userDirTitle: '用户与中介名录',
      userDirDesc: '选择一个用户以发送特定通知',
      unreadBadge: '未读',
      readBadge: '已读',
      deleteConfirm: '确定要删除这条消息吗？',
      successSend: '通知已成功发送！',
      failedSend: '发送失败，请稍后重试',
      successMarkRead: '已将所有消息设为已读',
      emptyTitleError: '请输入消息标题及内容'
    },
    en: {
      inboxTitle: 'Inbox',
      inboxSubtitle: 'View announcements, system notifications, and promo campaigns',
      sendTitle: 'Broadcast Announcements & Notifications',
      sendSubtitle: 'As a super administrator, send messages to user groups or individuals',
      typeAll: 'All Messages',
      typeUnread: 'Unread Only',
      typeSystem: 'System Alerts',
      typeAnnouncement: 'Announcements',
      typeUpdate: 'Product Updates',
      typeBonus: 'Special Promos',
      noMessages: 'No messages found',
      markAllRead: 'Mark All Read',
      deleteMsg: 'Delete Message',
      timeAgo: 'Received at',
      recipientLabel: 'Recipient Target',
      recipientAllStudents: 'All Students / Tenants',
      recipientAllAgents: 'All Agents / Managers',
      recipientAllUsers: 'All Platform Users',
      recipientSpecific: 'Specific Individual',
      searchPlaceholder: 'Search by name or email...',
      titleLabel: 'Notification Title',
      titlePlaceholder: 'Enter title...',
      contentLabel: 'Notification Body',
      contentPlaceholder: 'Enter message contents...',
      msgTypeLabel: 'Message Type',
      sendBtn: 'Send Notification',
      sendingBtn: 'Sending...',
      templateLabel: 'Use Template',
      templateNone: 'Custom (No template)',
      templateApproveTitle: 'Agent Application Approved',
      templateRejectTitle: 'Agent Application Rejected',
      templateMaintainTitle: 'System Scheduled Maintenance',
      templatePromoTitle: 'New Listing Commission Promo',
      userDirTitle: 'User & Agent Directory',
      userDirDesc: 'Select a user to send a direct message',
      unreadBadge: 'Unread',
      readBadge: 'Read',
      deleteConfirm: 'Are you sure you want to delete this message?',
      successSend: 'Notification sent successfully!',
      failedSend: 'Failed to send, please try again',
      successMarkRead: 'All messages marked as read',
      emptyTitleError: 'Title and content cannot be empty'
    }
  }[lang === 'zh' ? 'zh' : 'en'];

  // Templates definition
  const getTemplates = () => {
    if (lang === 'zh') {
      return [
        {
          id: 'approve',
          name: t.templateApproveTitle,
          title: '恭喜！您的中介注册申请已通过审核',
          content: '尊敬的申请人，您的中介注册申请已成功通过超级管理员审核。\n\n在下次重新登录后，您的账户将自动切换为中介身份，并直接进入中介管理后台开始录入和管理挂牌房源。感谢您选择 Malaysia Ez Rent！',
          type: 'agent_status' as const
        },
        {
          id: 'reject',
          name: t.templateRejectTitle,
          title: '关于您的中介注册申请审核结果通知',
          content: '您好，非常抱歉地通知您，您提交的中介注册申请由于以下原因未通过审核：\n[此处请输入拒绝的具体原因]\n\n如果您对此有任何疑问，请根据原因重新提交正确的 REN 证书照片。如有其他问题，请随时联系管理员支持。',
          type: 'agent_status' as const
        },
        {
          id: 'maintain',
          name: t.templateMaintainTitle,
          title: '【系统维护】平台服务器停机升级公告',
          content: '为提供更流畅的看房与租房服务，平台将于今晚凌晨 2:00 - 4:00 进行服务器停机优化和数据库维护。期间平台前端、移动端匿名上传以及 AI 找房功能将暂时不可用。请您提前做好业务安排，由此带来的不便敬请谅解！',
          type: 'update' as const
        },
        {
          id: 'promo',
          name: t.templatePromoTitle,
          title: '【限时福利】中介新挂牌首月租金服务费 8 折优惠活动',
          content: '尊敬的中介伙伴：\n为庆祝平台租金对账流程全面升级，凡在 6 月 1 日至 6 月 30 日期间，发布新房源并成功匹配租客签约的中介，首月首笔租金的手续费可享受 8 折优惠减免！名额有限，多挂多得，快去挂牌您的优质房源吧！',
          type: 'bonus' as const
        }
      ];
    } else {
      return [
        {
          id: 'approve',
          name: t.templateApproveTitle,
          title: 'Congratulations! Your Agent Registration is Approved',
          content: 'Dear applicant, your agent application has successfully passed our super administrator review.\n\nUpon your next login, your account will automatically convert to Agent status, granting you full access to the Agent Management Panel. Thank you for listing with Malaysia Ez Rent!',
          type: 'agent_status' as const
        },
        {
          id: 'reject',
          name: t.templateRejectTitle,
          title: 'Notification Regarding Your Agent Registration Status',
          content: 'Hello, we regret to inform you that your agent registration has been rejected due to the following reason:\n[Please enter rejection reason here]\n\nIf you have any questions or would like to appeal, please re-upload valid REN credentials or contact admin support directly.',
          type: 'agent_status' as const
        },
        {
          id: 'maintain',
          name: t.templateMaintainTitle,
          title: '[System Maintenance] Scheduled Server Upgrades',
          content: 'To improve your listing search and lease ledger experience, we will perform scheduled server upgrades tonight between 2:00 AM and 4:00 AM (Selangor Time). The platform services including AI assistant and payment uploads may be temporarily offline during this period. Thank you for your cooperation.',
          type: 'update' as const
        },
        {
          id: 'promo',
          name: t.templatePromoTitle,
          title: '[Limited Promo] 20% Off Service Fees on New Month-1 Listings',
          content: 'Dear Partner,\nTo celebrate the upgrade of our lease settlement system, agents who publish a new property and successfully execute a tenant contract before June 30th will receive a 20% discount on first-month commission fees! List more to save more today!',
          type: 'bonus' as const
        }
      ];
    }
  };

  const applyTemplate = (templateId: string) => {
    if (templateId === 'none') {
      setNewTitle('');
      setNewContent('');
      setNewType('announcement');
      return;
    }
    const tmpl = getTemplates().find(t => t.id === templateId);
    if (tmpl) {
      setNewTitle(tmpl.title);
      setNewContent(tmpl.content);
      setNewType(tmpl.type);
    }
  };

  // Fetch current user ID and load notifications
  const loadData = async () => {
    setLoading(true);
    let userId = '';

    // Get Auth User ID
    if (isMockDatabase) {
      userId = localStorage.getItem('ez_tenant_id') || 'tenant-123';
      setAuthUserId(userId);
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        userId = user.id;
        setAuthUserId(userId);
      }
    }

    if (!userId) {
      setLoading(false);
      return;
    }

    // Load User Notifications
    if (isMockDatabase) {
      const allNotifications = JSON.parse(localStorage.getItem('ez_user_notifications') || '[]');
      // Filter by current user
      const myNotifications = allNotifications.filter((n: any) => n.user_id === userId);
      // Sort newest first
      myNotifications.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setNotifications(myNotifications);

      const unreadCount = myNotifications.filter((n: any) => !n.is_read).length;
      if (onUnreadCountChange) onUnreadCountChange(unreadCount);
    } else {
      const { data, error } = await supabase
        .from('user_notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setNotifications(data);
        const unreadCount = data.filter((n: any) => !n.is_read).length;
        if (onUnreadCountChange) onUnreadCountChange(unreadCount);
      }
    }

    // Load Directory if super admin
    if (adminRole === 'super_admin') {
      if (isMockDatabase) {
        const mockUsers = JSON.parse(localStorage.getItem('ez_users') || '[]');
        const mockAdmins = JSON.parse(localStorage.getItem('ez_admins') || '[]');

        const dir: UserDirectoryItem[] = [];
        mockUsers.forEach((u: any) => {
          dir.push({ id: u.id, name: u.full_name || 'Student User', email: u.phone || 'No Email', role: 'student', phone: u.phone });
        });
        mockAdmins.forEach((a: any) => {
          dir.push({ id: a.id, name: a.display_name || 'Agent/Admin', email: a.email, role: a.role === 'super_admin' ? 'super_admin' : 'agent', phone: a.phone, whatsapp: a.whatsapp });
        });
        setUsersDirectory(dir);
      } else {
        // Query users and admin_users from Supabase
        const { data: dbUsers } = await supabase.from('users').select('id, full_name, phone');
        const { data: dbAdmins } = await supabase.from('admin_users').select('id, display_name, email, role, phone, whatsapp');

        const dir: UserDirectoryItem[] = [];
        if (dbUsers) {
          dbUsers.forEach((u: any) => {
            dir.push({ id: u.id, name: u.full_name || 'Student Tenant', email: u.phone || 'No Email', role: 'student', phone: u.phone });
          });
        }
        if (dbAdmins) {
          dbAdmins.forEach((a: any) => {
            dir.push({ id: a.id, name: a.display_name || 'Agent/Admin', email: a.email, role: a.role === 'super_admin' ? 'super_admin' : 'agent', phone: a.phone, whatsapp: a.whatsapp });
          });
        }
        setUsersDirectory(dir);
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [adminRole]);

  // Handle Mark Message as Read
  const handleMarkAsRead = async (msgId: string) => {
    const updated = notifications.map(n => {
      if (n.id === msgId && !n.is_read) {
        return { ...n, is_read: true };
      }
      return n;
    });
    setNotifications(updated);

    const unreadCount = updated.filter(n => !n.is_read).length;
    if (onUnreadCountChange) onUnreadCountChange(unreadCount);

    if (isMockDatabase) {
      const allNotifications = JSON.parse(localStorage.getItem('ez_user_notifications') || '[]');
      const idx = allNotifications.findIndex((n: any) => n.id === msgId);
      if (idx !== -1) {
        allNotifications[idx].is_read = true;
        localStorage.setItem('ez_user_notifications', JSON.stringify(allNotifications));
      }
    } else {
      await supabase
        .from('user_notifications')
        .update({ is_read: true })
        .eq('id', msgId);
    }
  };

  // Mark all as read
  const handleMarkAllRead = async () => {
    const updated = notifications.map(n => ({ ...n, is_read: true }));
    setNotifications(updated);
    if (onUnreadCountChange) onUnreadCountChange(0);

    showToast(t.successMarkRead, true);

    if (isMockDatabase) {
      const allNotifications = JSON.parse(localStorage.getItem('ez_user_notifications') || '[]');
      const filtered = allNotifications.map((n: any) => {
        if (n.user_id === authUserId) {
          return { ...n, is_read: true };
        }
        return n;
      });
      localStorage.setItem('ez_user_notifications', JSON.stringify(filtered));
    } else {
      await supabase
        .from('user_notifications')
        .update({ is_read: true })
        .eq('user_id', authUserId);
    }
  };

  // Delete message
  const handleDeleteMessage = async (msgId: string) => {
    if (!confirm(t.deleteConfirm)) return;

    const updated = notifications.filter(n => n.id !== msgId);
    setNotifications(updated);

    const unreadCount = updated.filter(n => !n.is_read).length;
    if (onUnreadCountChange) onUnreadCountChange(unreadCount);

    if (isMockDatabase) {
      const allNotifications = JSON.parse(localStorage.getItem('ez_user_notifications') || '[]');
      const filtered = allNotifications.filter((n: any) => n.id !== msgId);
      localStorage.setItem('ez_user_notifications', JSON.stringify(filtered));
    } else {
      await supabase
        .from('user_notifications')
        .delete()
        .eq('id', msgId);
    }
  };

  // Send notification / announcement (Super Admin only)
  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) {
      showToast(t.emptyTitleError, false);
      return;
    }

    setSending(true);

    // Collect recipient user IDs
    let targetIds: string[] = [];

    if (recipientScope === 'specific') {
      if (!selectedRecipient) {
        showToast(lang === 'zh' ? '请选择一个指定接收用户' : 'Please select a recipient user', false);
        setSending(false);
        return;
      }
      targetIds = [selectedRecipient.id];
    } else if (recipientScope === 'all_students') {
      targetIds = usersDirectory.filter(u => u.role === 'student').map(u => u.id);
    } else if (recipientScope === 'all_agents') {
      targetIds = usersDirectory.filter(u => u.role === 'agent' || u.role === 'super_admin').map(u => u.id);
    } else if (recipientScope === 'all_users') {
      targetIds = usersDirectory.map(u => u.id);
    }

    if (targetIds.length === 0) {
      showToast(lang === 'zh' ? '目标接收用户群为空，发送取消' : 'Recipient target group is empty', false);
      setSending(false);
      return;
    }

    try {
      if (isMockDatabase) {
        const allNotifications = JSON.parse(localStorage.getItem('ez_user_notifications') || '[]');
        
        targetIds.forEach(targetId => {
          allNotifications.push({
            id: `msg-mock-${Math.random().toString(36).substring(2, 11)}`,
            user_id: targetId,
            title: newTitle,
            content: newContent,
            type: newType,
            is_read: false,
            created_at: new Date().toISOString()
          });
        });

        localStorage.setItem('ez_user_notifications', JSON.stringify(allNotifications));
        showToast(t.successSend, true);
        
        // Reset form
        setNewTitle('');
        setNewContent('');
        setSelectedRecipient(null);
        setRecipientScope('all_students');
      } else {
        // Prepare batch insert rows
        const rows = targetIds.map(targetId => ({
          user_id: targetId,
          title: newTitle,
          content: newContent,
          type: newType,
          is_read: false
        }));

        const { error } = await supabase.from('user_notifications').insert(rows);

        if (error) throw error;
        
        showToast(t.successSend, true);
        setNewTitle('');
        setNewContent('');
        setSelectedRecipient(null);
        setRecipientScope('all_students');
      }
    } catch (err: any) {
      console.error(err);
      showToast(t.failedSend, false);
    } finally {
      setSending(false);
    }
  };

  const showToast = (text: string, success: boolean) => {
    setToastMessage({ text, success });
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Helper to render type icons
  const renderTypeIcon = (type: string, size = 16) => {
    switch (type) {
      case 'system': return <AlertTriangle size={size} className="text-amber-500" style={{ color: 'var(--warning)' }} />;
      case 'announcement': return <Megaphone size={size} className="text-blue-500" style={{ color: 'var(--info)' }} />;
      case 'update': return <RefreshCw size={size} className="text-indigo-500" style={{ color: 'var(--primary)' }} />;
      case 'bonus': return <Sparkles size={size} className="text-emerald-500" style={{ color: 'var(--success)' }} />;
      case 'agent_status': return <CheckCircle2 size={size} className="text-purple-500" style={{ color: 'var(--accent)' }} />;
      default: return <Info size={size} className="text-gray-500" />;
    }
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case 'system': return t.typeSystem;
      case 'announcement': return t.typeAnnouncement;
      case 'update': return t.typeUpdate;
      case 'bonus': return t.typeBonus;
      case 'agent_status': return lang === 'zh' ? '中介状态更新' : 'Agent Status Update';
      default: return 'System';
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (filterType === 'all') return true;
    if (filterType === 'unread') return !n.is_read;
    return n.type === filterType;
  });

  const filteredDirectory = usersDirectory.filter(u => {
    const q = searchQuery.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  return (
    <div style={{ padding: '20px 24px', animation: 'fadeIn 0.3s ease' }}>
      {/* Toast Alert */}
      {toastMessage && (
        <div style={{
          position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 9999,
          background: 'var(--bg-surface)', backdropFilter: 'blur(20px)',
          border: '1px solid',
          borderColor: toastMessage.success ? 'rgba(16, 185, 129, 0.45)' : 'rgba(239, 68, 68, 0.45)',
          boxShadow: 'var(--glass-shadow)',
          padding: '12px 24px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 10,
          color: 'var(--text-h)', fontWeight: 600, fontSize: '0.88rem',
          animation: 'slideDown 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
          backgroundClip: 'padding-box',
          backgroundColor: toastMessage.success ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)'
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: toastMessage.success ? 'var(--success)' : 'var(--danger)'
          }}>
            {toastMessage.success ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          </div>
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Main Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: adminRole === 'super_admin' ? '1fr 380px' : '1fr',
        gap: 24,
        alignItems: 'start',
        maxWidth: adminRole === 'super_admin' ? '1200px' : '860px',
        width: '100%',
        margin: '0 auto'
      }}>
        
        {/* Left Side: Personal Messages Inbox */}
        <div style={{
          background: 'var(--bg-surface-solid)', border: '1px solid var(--glass-border)',
          borderRadius: 16, padding: 24, boxShadow: 'var(--card-shadow)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-h)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Mail size={22} style={{ color: 'var(--primary)' }} />
                {t.inboxTitle}
                {notifications.filter(n => !n.is_read).length > 0 && (
                  <span style={{ fontSize: '0.72rem', background: 'var(--danger)', color: 'white', padding: '2px 8px', borderRadius: 20, verticalAlign: 'middle' }}>
                    {notifications.filter(n => !n.is_read).length}
                  </span>
                )}
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>{t.inboxSubtitle}</p>
            </div>
            
            {notifications.some(n => !n.is_read) && (
              <button onClick={handleMarkAllRead} style={{
                background: 'var(--primary-light)', color: 'var(--primary)', border: 'none',
                padding: '6px 14px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600,
                cursor: 'pointer', transition: '0.2s', display: 'flex', alignItems: 'center', gap: 4
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                <CheckCircle2 size={13} />
                {t.markAllRead}
              </button>
            )}
          </div>

          {/* Filtering row */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
            {[
              { id: 'all', label: t.typeAll },
              { id: 'unread', label: t.typeUnread },
              { id: 'system', label: t.typeSystem },
              { id: 'announcement', label: t.typeAnnouncement },
              { id: 'update', label: t.typeUpdate },
              { id: 'bonus', label: t.typeBonus }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id)}
                style={{
                  padding: '6px 14px', borderRadius: 20, fontSize: '0.78rem', border: '1px solid var(--glass-border)',
                  background: filterType === tab.id ? 'var(--primary)' : 'var(--glass-bg)',
                  color: filterType === tab.id ? 'white' : 'var(--text-body)',
                  cursor: 'pointer', fontWeight: 600, transition: '0.2s'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Inbox List */}
          {loading ? (
            <div style={{ padding: '60px 0', textAlign: 'center' }}>
              <div style={{ width: 28, height: 28, border: '2px solid var(--glass-border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Loading messages...</span>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', background: 'var(--glass-bg)', borderRadius: 12, border: '1px dashed var(--glass-border)' }}>
              <MailOpen size={40} style={{ color: 'var(--text-muted)', opacity: 0.35, marginBottom: 12 }} />
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>{t.noMessages}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filteredNotifications.map(item => {
                const isExpanded = expandedId === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      setExpandedId(isExpanded ? null : item.id);
                      if (!item.is_read) handleMarkAsRead(item.id);
                    }}
                    style={{
                      background: item.is_read ? 'var(--glass-bg)' : 'rgba(13, 148, 136, 0.04)',
                      border: `1px solid ${item.is_read ? 'var(--glass-border)' : 'var(--primary-glow)'}`,
                      borderRadius: 12, padding: '14px 16px', cursor: 'pointer', transition: '0.2s',
                      position: 'relative', overflow: 'hidden'
                    }}
                    className="notification-card-hover"
                  >
                    {/* Left colored stripe indicator for unread */}
                    {!item.is_read && (
                      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: 'var(--primary)' }} />
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flex: 1 }}>
                        <div style={{
                          marginTop: 2, padding: 8, borderRadius: 8,
                          background: item.is_read ? 'rgba(0,0,0,0.02)' : 'var(--primary-light)'
                        }}>
                          {renderTypeIcon(item.type)}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'var(--bg-hover)', color: 'var(--text-muted)' }}>
                              {getTypeName(item.type)}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              {t.timeAgo} {new Date(item.created_at).toLocaleString()}
                            </span>
                          </div>
                          <h4 style={{
                            fontSize: '0.9rem', fontWeight: item.is_read ? 600 : 800,
                            color: 'var(--text-h)', margin: '8px 0 4px', lineHeight: 1.4
                          }}>
                            {item.title}
                          </h4>
                          
                          {/* Snippet or full content */}
                          <p style={isExpanded ? {
                            fontSize: '0.82rem', color: 'var(--text-body)', lineHeight: 1.5,
                            margin: 0, whiteSpace: 'pre-wrap'
                          } : {
                            fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5,
                            margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                            overflow: 'hidden', textOverflow: 'ellipsis'
                          }}>
                            {item.content}
                          </p>
                        </div>
                      </div>

                      {/* Right Action buttons */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between', flexShrink: 0 }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteMessage(item.id);
                          }}
                          style={{
                            background: 'transparent', border: 'none', color: 'var(--text-muted)',
                            padding: 4, borderRadius: 6, cursor: 'pointer', transition: '0.2s'
                          }}
                          onMouseEnter={e => { e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.background = 'var(--danger-light)'; }}
                          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
                          title={t.deleteMsg}
                        >
                          <Trash2 size={14} />
                        </button>
                        <ChevronRight size={16} style={{
                          color: 'var(--text-muted)', transition: '0.2s',
                          transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                          marginTop: 8
                        }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Super Admin Send Console */}
        {adminRole === 'super_admin' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Send panel */}
            <div style={{
              background: 'var(--bg-surface-solid)', border: '1px solid var(--glass-border)',
              borderRadius: 16, padding: 24, boxShadow: 'var(--card-shadow)'
            }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-h)', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Send size={18} style={{ color: 'var(--primary)' }} />
                {t.sendTitle}
              </h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0 0 16px', lineHeight: 1.4 }}>{t.sendSubtitle}</p>

              <form onSubmit={handleSendNotification} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Scope selector */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-h)', marginBottom: 6 }}>
                    {t.recipientLabel}
                  </label>
                  <select
                    value={recipientScope}
                    onChange={(e: any) => {
                      setRecipientScope(e.target.value);
                      if (e.target.value !== 'specific') setSelectedRecipient(null);
                    }}
                    className="form-select"
                    style={{
                      fontSize: '0.82rem', height: 'auto'
                    }}
                  >
                    <option value="all_students">{t.recipientAllStudents}</option>
                    <option value="all_agents">{t.recipientAllAgents}</option>
                    <option value="all_users">{t.recipientAllUsers}</option>
                    <option value="specific">{t.recipientSpecific}</option>
                  </select>
                </div>

                {/* Specific Recipient Selected Tag */}
                {recipientScope === 'specific' && (
                  <div style={{
                    background: 'var(--bg-hover)', border: '1px solid var(--glass-border)', borderRadius: 8,
                    padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <User size={14} style={{ color: 'var(--primary)' }} />
                      <div>
                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-h)' }}>
                          {selectedRecipient ? selectedRecipient.name : (lang === 'zh' ? '请在下方列表选择用户' : 'Select user from list below')}
                        </div>
                        {selectedRecipient && (
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{selectedRecipient.email}</div>
                        )}
                      </div>
                    </div>
                    {selectedRecipient && (
                      <button type="button" onClick={() => setSelectedRecipient(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                        <X size={14} />
                      </button>
                    )}
                  </div>
                )}

                {/* Template Selector */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-h)', marginBottom: 6 }}>
                    <FileText size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                    {t.templateLabel}
                  </label>
                  <select
                    onChange={(e) => applyTemplate(e.target.value)}
                    defaultValue="none"
                    className="form-select"
                    style={{
                      fontSize: '0.82rem', height: 'auto'
                    }}
                  >
                    <option value="none">{t.templateNone}</option>
                    <option value="approve">{t.templateApproveTitle}</option>
                    <option value="reject">{t.templateRejectTitle}</option>
                    <option value="maintain">{t.templateMaintainTitle}</option>
                    <option value="promo">{t.templatePromoTitle}</option>
                  </select>
                </div>

                {/* Title */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-h)', marginBottom: 6 }}>
                    {t.titleLabel}
                  </label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    placeholder={t.titlePlaceholder}
                    className="form-input"
                    style={{
                      fontSize: '0.82rem', height: 'auto'
                    }}
                  />
                </div>

                {/* Type */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-h)', marginBottom: 6 }}>
                    {t.msgTypeLabel}
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {[
                      { id: 'announcement', label: t.typeAnnouncement },
                      { id: 'system', label: t.typeSystem },
                      { id: 'update', label: t.typeUpdate },
                      { id: 'bonus', label: t.typeBonus }
                    ].map(type => (
                      <label key={type.id} style={{
                        display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem',
                        padding: '6px 8px', borderRadius: 6, border: '1px solid var(--glass-border)',
                        background: newType === type.id ? 'var(--bg-hover)' : 'transparent',
                        cursor: 'pointer'
                      }}>
                        <input
                          type="radio"
                          name="msgType"
                          checked={newType === type.id}
                          onChange={() => setNewType(type.id as any)}
                          style={{ margin: 0 }}
                        />
                        {type.label}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Content */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-h)', marginBottom: 6 }}>
                    {t.contentLabel}
                  </label>
                  <textarea
                    value={newContent}
                    onChange={e => setNewContent(e.target.value)}
                    placeholder={t.contentPlaceholder}
                    rows={5}
                    className="form-textarea"
                    style={{
                      fontSize: '0.82rem', resize: 'vertical', lineHeight: 1.5
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={sending}
                  style={{
                    width: '100%', background: 'var(--success)', color: 'white', border: 'none',
                    padding: '10px 0', borderRadius: 8, fontSize: '0.82rem', fontWeight: 700,
                    cursor: 'pointer', transition: '0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                  }}
                  onMouseEnter={e => e.currentTarget.style.filter = 'brightness(0.92)'}
                  onMouseLeave={e => e.currentTarget.style.filter = 'none'}
                >
                  <Send size={14} />
                  {sending ? t.sendingBtn : t.sendBtn}
                </button>
              </form>
            </div>

            {/* User directory */}
            {recipientScope === 'specific' && (
              <div style={{
                background: 'var(--bg-surface-solid)', border: '1px solid var(--glass-border)',
                borderRadius: 16, padding: 20, maxHeight: 300, display: 'flex', flexDirection: 'column',
                boxShadow: 'var(--card-shadow)'
              }}>
                <h3 style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-h)', margin: '0 0 2px' }}>{t.userDirTitle}</h3>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '0 0 10px' }}>{t.userDirDesc}</p>

                {/* Search box */}
                <div style={{ position: 'relative', marginBottom: 10 }}>
                  <Search size={13} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder={t.searchPlaceholder}
                    className="form-input"
                    style={{
                      paddingLeft: '26px', fontSize: '0.75rem', height: 'auto'
                    }}
                  />
                </div>

                {/* List container */}
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {filteredDirectory.length === 0 ? (
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>
                      {lang === 'zh' ? '未找到匹配的用户' : 'No matching users found'}
                    </div>
                  ) : (
                    filteredDirectory.map(user => (
                      <div
                        key={user.id}
                        onClick={() => setSelectedRecipient({ id: user.id, name: user.name, email: user.email })}
                        style={{
                          display: 'flex', justifyItems: 'center', justifyContent: 'space-between', padding: '6px 8px',
                          borderRadius: 6, background: selectedRecipient?.id === user.id ? 'var(--bg-hover)' : 'var(--glass-bg)',
                          border: `1px solid ${selectedRecipient?.id === user.id ? 'var(--primary)' : 'var(--glass-border)'}`,
                          cursor: 'pointer', transition: '0.15s'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                          <div style={{
                            width: 22, height: 22, borderRadius: '50%', background: 'var(--primary-light)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                          }}>
                            <User size={10} style={{ color: 'var(--primary)' }} />
                          </div>
                          <div style={{ overflow: 'hidden' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-h)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                              {user.name}
                            </div>
                            <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                              {user.email}
                            </div>
                          </div>
                        </div>
                        <span style={{
                          fontSize: '0.58rem', fontWeight: 700, padding: '2px 6px', borderRadius: 4, height: 'fit-content',
                          background: user.role === 'student' ? 'var(--success-light)' : 'var(--warning-light)',
                          color: user.role === 'student' ? 'var(--success)' : 'var(--warning)', alignSelf: 'center'
                        }}>
                          {user.role === 'student' ? (lang === 'zh' ? '租客' : 'Tenant') : (lang === 'zh' ? '中介' : 'Agent')}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
