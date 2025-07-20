import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Trash2, 
  Settings,
  Filter,
  AlertCircle,
  DollarSign,
  Megaphone,
  Trophy,
  Clock,
  Loader2,
  Search
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { useNotifications } from '../../hooks/useNotifications';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

const NotificationsPage = () => {
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications
  } = useNotifications();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'donations':
        return <DollarSign className="w-5 h-5 text-green-600" />;
      case 'updates':
        return <Megaphone className="w-5 h-5 text-blue-600" />;
      case 'goal_reached':
        return <Trophy className="w-5 h-5 text-yellow-600" />;
      case 'campaign_ending':
        return <Clock className="w-5 h-5 text-orange-600" />;
      case 'trust_changes':
        return <AlertCircle className="w-5 h-5 text-purple-600" />;
      default:
        return <Bell className="w-5 h-5 text-gray-600" />;
    }
  };

  const getNotificationUrl = (notification) => {
    const data = notification.data || {};
    switch (notification.type) {
      case 'donations':
        return `/campaigns/${data.campaign_id}`;
      case 'updates':
        return `/campaigns/${data.campaign_id}/updates/${data.update_id}`;
      case 'goal_reached':
      case 'campaign_ending':
        return `/campaigns/${data.campaign_id}`;
      case 'trust_changes':
        return '/profile#trust-score';
      default:
        return '#';
    }
  };

  // Filter notifications
  const filteredNotifications = notifications.filter(n => {
    if (showUnreadOnly && n.read) return false;
    if (filterType !== 'all' && n.type !== filterType) return false;
    if (searchTerm && !n.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !n.body?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const notificationTypes = [
    { value: 'all', label: 'All' },
    { value: 'donations', label: 'Donations' },
    { value: 'updates', label: 'Updates' },
    { value: 'goal_reached', label: 'Goals' },
    { value: 'campaign_ending', label: 'Endings' },
    { value: 'trust_changes', label: 'Trust' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Notifications</h1>
            <p className="text-gray-600 mt-1">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                onClick={markAllAsRead}
                className="flex items-center gap-2"
              >
                <CheckCheck className="w-4 h-4" />
                Mark all read
              </Button>
            )}
            <Button
              variant="outline"
              onClick={refreshNotifications}
              className="flex items-center gap-2"
            >
              <Bell className="w-4 h-4" />
              Refresh
            </Button>
            <Link to="/settings/notifications">
              <Button variant="outline">
                <Settings className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    type="text"
                    placeholder="Search notifications..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  {notificationTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                <Button
                  variant={showUnreadOnly ? 'primary' : 'outline'}
                  onClick={() => setShowUnreadOnly(!showUnreadOnly)}
                  className="flex items-center gap-2"
                >
                  <Filter className="w-4 h-4" />
                  Unread
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications List */}
        {filteredNotifications.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Bell className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">
                {searchTerm || filterType !== 'all' || showUnreadOnly
                  ? 'No notifications match your filters'
                  : 'No notifications yet'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {filteredNotifications.map((notification, index) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className={`${!notification.read ? 'border-primary-200 bg-primary-50' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        <div className="flex-shrink-0">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <Link
                            to={getNotificationUrl(notification)}
                            className="block hover:underline"
                            onClick={() => !notification.read && markAsRead(notification.id)}
                          >
                            <h3 className={`text-lg ${!notification.read ? 'font-semibold' : 'font-medium'} text-gray-900`}>
                              {notification.title}
                            </h3>
                            {notification.body && (
                              <p className="text-gray-600 mt-1">
                                {notification.body}
                              </p>
                            )}
                          </Link>
                          <p className="text-sm text-gray-500 mt-2">
                            {formatDistanceToNow(new Date(notification.sent_at), {
                              addSuffix: true
                            })}
                          </p>
                        </div>
                        <div className="flex-shrink-0 flex items-start gap-2">
                          {!notification.read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markAsRead(notification.id)}
                              title="Mark as read"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteNotification(notification.id)}
                            className="text-red-600 hover:text-red-700"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default NotificationsPage;