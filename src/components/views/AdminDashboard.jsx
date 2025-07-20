import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Users, FileText, MessageSquare, BarChart, Shield, Slash, MoreVertical, MessageCircle, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu.jsx";
import { useAppLogic } from '@/hooks/useAppLogic';

const StatCard = ({ title, value, icon, color }) => (
    <Card className="bg-white/10 border-white/20 text-white backdrop-blur-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-200">{title}</CardTitle>
            {React.cloneElement(icon, { className: `h-4 w-4 text-${color}-400`})}
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
        </CardContent>
    </Card>
);

const AdminDashboard = () => {
    const [stats, setStats] = useState({ 
        total_users: 0, 
        total_stories: 0, 
        total_posts: 0,
        campaigns_pending: 0,
        campaigns_approved: 0,
        campaigns_rejected: 0
    });
    const [allUsers, setAllUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const { handlers } = useAppLogic();

    const fetchAdminData = useCallback(async () => {
        setLoading(true);
        try {
            const { data: statsData, error: statsError } = await supabase.rpc('get_platform_stats');
            if (statsError) throw statsError;
            
            // Fetch campaign moderation stats
            const { count: pendingCount } = await supabase
                .from('campaigns')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'under_review');
                
            const { count: approvedCount } = await supabase
                .from('campaigns')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'approved');
                
            const { count: rejectedCount } = await supabase
                .from('campaigns')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'rejected');
            
            setStats({
                ...statsData[0],
                campaigns_pending: pendingCount || 0,
                campaigns_approved: approvedCount || 0,
                campaigns_rejected: rejectedCount || 0
            });

            const { data: usersData, error: usersError } = await supabase
                .from('profiles')
                .select('*')
                .order('updated_at', { ascending: false, nullsFirst: false });
            if (usersError) throw usersError;
            setAllUsers(usersData);
        } catch (error) {
            toast({ title: "Error fetching admin data", description: error.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchAdminData();
    }, [fetchAdminData]);

    const handleSetRole = async (userId, newRole) => {
        const { error } = await supabase.rpc('set_user_role', { target_user_id: userId, new_role: newRole });
        if (error) {
            toast({ title: "Error setting role", description: error.message, variant: 'destructive' });
        } else {
            toast({ title: "Success!", description: `User role has been updated to ${newRole}.` });
            fetchAdminData();
        }
    };

    const handleBanUser = async (userId) => {
        const banDays = parseInt(prompt("Enter number of days to ban user:", "7"), 10);
        if (isNaN(banDays) || banDays <= 0) {
            toast({ title: "Invalid duration", description: "Please enter a positive number of days.", variant: "destructive" });
            return;
        }
        const { error } = await supabase.rpc('ban_user', { target_user_id: userId, ban_duration_days: banDays });
        if (error) {
            toast({ title: "Error banning user", description: error.message, variant: 'destructive' });
        } else {
            toast({ title: "User Banned", description: `User has been banned for ${banDays} days.` });
            fetchAdminData();
        }
    };
    
    const handleUnbanUser = async (userId) => {
         const { error } = await supabase.rpc('ban_user', { target_user_id: userId, ban_duration_days: -1 }); // ban_user can unban too
         if (error) {
            toast({ title: "Error unbanning user", description: error.message, variant: 'destructive' });
        } else {
            toast({ title: "User Unbanned", description: `User has been unbanned.` });
            fetchAdminData();
        }
    };

    const filteredUsers = allUsers.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <motion.div
            key="admin-dashboard"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="container mx-auto py-8 px-4"
        >
            <h1 className="text-4xl font-bold text-white mb-8 flex items-center gap-3">
                <BarChart className="w-10 h-10 text-cyan-400" />
                Admin Dashboard
            </h1>

            {loading ? (
                <div className="text-center text-white">Loading dashboard...</div>
            ) : (
                <>
                    <div className="grid gap-4 md:grid-cols-3 mb-8">
                        <StatCard title="Total Users" value={stats.total_users} icon={<Users />} color="purple" />
                        <StatCard title="Total Stories" value={stats.total_stories} icon={<FileText />} color="pink" />
                        <StatCard title="Community Posts" value={stats.total_posts} icon={<MessageSquare />} color="teal" />
                    </div>

                    {/* Campaign Moderation Stats */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                <Shield className="w-6 h-6 text-cyan-400" />
                                Campaign Moderation
                            </h2>
                            <Button 
                                onClick={() => window.location.href = '/admin/moderation'}
                                className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border-cyan-500/50"
                            >
                                <AlertTriangle className="w-4 h-4 mr-2" />
                                Open Moderation Dashboard
                            </Button>
                        </div>
                        <div className="grid gap-4 md:grid-cols-3">
                            <StatCard 
                                title="Pending Review" 
                                value={stats.campaigns_pending} 
                                icon={<AlertTriangle />} 
                                color="yellow" 
                            />
                            <StatCard 
                                title="Approved Campaigns" 
                                value={stats.campaigns_approved} 
                                icon={<CheckCircle />} 
                                color="green" 
                            />
                            <StatCard 
                                title="Rejected Campaigns" 
                                value={stats.campaigns_rejected} 
                                icon={<XCircle />} 
                                color="red" 
                            />
                        </div>
                    </div>

                    <Card className="bg-white/10 border-white/20 text-white backdrop-blur-lg mt-8">
                        <CardHeader>
                            <CardTitle className="text-lg text-white">User Management</CardTitle>
                             <div className="mt-2">
                                <Input 
                                    placeholder="Search users by name or email..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="bg-black/20 border-white/20 text-white"
                                />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-white/20">
                                            <th className="p-4">User</th>
                                            <th className="p-4">Email</th>
                                            <th className="p-4">Role</th>
                                            <th className="p-4">Status</th>
                                            <th className="p-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredUsers.map(user => (
                                            <tr key={user.id} className="border-b border-white/10 hover:bg-white/5">
                                                <td className="p-4 flex items-center gap-3">
                                                    <Avatar className="w-10 h-10">
                                                        <AvatarImage src={user.avatar_url} alt={user.name} />
                                                        <AvatarFallback>{user.name?.[0]}</AvatarFallback>
                                                    </Avatar>
                                                    {user.name}
                                                </td>
                                                <td className="p-4 text-blue-200">{user.email}</td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${user.role === 'admin' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-gray-500/20 text-gray-300'}`}>
                                                        {user.role}
                                                    </span>
                                                </td>
                                                 <td className="p-4">
                                                    {user.banned_until && new Date(user.banned_until) > new Date() ? (
                                                        <span className="text-red-400 font-semibold">Banned</span>
                                                    ) : (
                                                        <span className="text-green-400 font-semibold">Active</span>
                                                    )}
                                                </td>
                                                <td className="p-4 text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon"><MoreVertical className="w-5 h-5"/></Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent className="bg-black/50 border-white/20 text-white backdrop-blur-lg">
                                                            <DropdownMenuItem onClick={() => handlers.handleSendMessage(user.id)}>
                                                                <MessageCircle className="mr-2 h-4 w-4"/> Message
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleSetRole(user.id, user.role === 'admin' ? 'authenticated' : 'admin')}>
                                                                <Shield className="mr-2 h-4 w-4"/> {user.role === 'admin' ? 'Revoke Admin' : 'Make Admin'}
                                                            </DropdownMenuItem>
                                                            {user.banned_until && new Date(user.banned_until) > new Date() ? (
                                                                <DropdownMenuItem onClick={() => handleUnbanUser(user.id)} className="text-green-400 focus:text-green-300">
                                                                    <Slash className="mr-2 h-4 w-4"/> Unban User
                                                                </DropdownMenuItem>
                                                            ) : (
                                                                <DropdownMenuItem onClick={() => handleBanUser(user.id)} className="text-red-400 focus:text-red-300">
                                                                    <Slash className="mr-2 h-4 w-4"/> Ban User
                                                                </DropdownMenuItem>
                                                            )}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}
        </motion.div>
    );
};

export default AdminDashboard;
