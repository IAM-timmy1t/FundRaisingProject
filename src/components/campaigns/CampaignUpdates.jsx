import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar, FileText, Image, Video, Receipt } from 'lucide-react';
import { format } from 'date-fns';

const CampaignUpdates = ({ updates = [] }) => {
  const getUpdateIcon = (type) => {
    const icons = {
      text: <FileText className="w-4 h-4" />,
      photo: <Image className="w-4 h-4" />,
      video: <Video className="w-4 h-4" />,
      receipt: <Receipt className="w-4 h-4" />,
    };
    return icons[type] || icons.text;
  };

  const getUpdateTypeBadge = (type) => {
    const variants = {
      text: 'outline',
      photo: 'secondary',
      video: 'secondary',
      receipt: 'default',
    };
    return (
      <Badge variant={variants[type] || 'outline'} className="text-xs">
        {type}
      </Badge>
    );
  };

  if (!updates || updates.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Campaign Updates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No updates posted yet</p>
            <p className="text-sm mt-1">Check back later for campaign progress</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Campaign Updates ({updates.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-4">
            {updates.map((update, index) => (
              <div
                key={update.id || index}
                className="border rounded-lg p-4 space-y-3 hover:bg-muted/50 transition-colors"
              >
                {/* Update Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {getUpdateIcon(update.update_type)}
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{update.title || 'Update'}</span>
                      {getUpdateTypeBadge(update.update_type)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    <span>{format(new Date(update.created_at), 'MMM d, yyyy')}</span>
                  </div>
                </div>

                {/* Update Content */}
                <div className="space-y-2">
                  {update.content && (
                    <p className="text-sm whitespace-pre-wrap">{update.content}</p>
                  )}

                  {/* Media Preview */}
                  {update.media_urls && update.media_urls.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {update.media_urls.map((url, idx) => (
                        <div key={idx} className="relative aspect-video bg-muted rounded overflow-hidden">
                          {update.update_type === 'video' ? (
                            <video
                              src={url}
                              className="w-full h-full object-cover"
                              controls
                            />
                          ) : (
                            <img
                              src={url}
                              alt={`Update ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Spend Information */}
                  {update.spend_amount && (
                    <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                      <Receipt className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">
                        Spent: <strong>${update.spend_amount}</strong>
                        {update.spend_category && ` on ${update.spend_category}`}
                      </span>
                    </div>
                  )}
                </div>

                {/* Update Footer */}
                {update.donor_reactions && (
                  <div className="flex items-center gap-4 pt-2 border-t text-sm text-muted-foreground">
                    <span>❤️ {update.donor_reactions.likes || 0}</span>
                    <span>💬 {update.donor_reactions.comments || 0}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default CampaignUpdates;