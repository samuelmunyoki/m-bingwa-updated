import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { api } from "@/convex/_generated/api";
import { ScrollArea } from "./scroll-area";

function MyMessages() {
  const [activeTab, setActiveTab] = useState("unread");
  const [cursor, setCursor] = useState<number | undefined>(undefined);
  const limit = 10;

  const result = useQuery(api.features.notifications.getPaginatedNotifications, {
    cursor,
    limit,
  });

  const notifications = result?.notifications ?? [];
  const newCursor = result?.cursor;
  const hasMore = result?.hasMore ?? false;

  const markAsRead = useMutation(api.features.notifications.markNotificationAsRead);

  const handleMarkAsRead = (id: string) => {
    markAsRead({ id });
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  };

  const loadMore = () => {
    if (newCursor !== undefined) {
      setCursor(newCursor);
    }
  };

  const filteredNotifications = notifications.filter((notification) =>
    activeTab === "unread"
      ? !notification.notificationIsRead
      : notification.notificationIsRead
  );

  return (
    <Card className="w-full flex flex-col">
      <CardHeader className="flex-shrink-0 border-b border-gray-300">
        <CardTitle className="font-normal">Notifications</CardTitle>
      </CardHeader>
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full px-3 pb-3"
      >
        <TabsList className="grid w-full grid-cols-2 h-10 my-3 p-1 bg-muted rounded-lg relative">
          <div
            className="absolute h-[calc(100%-8px)] top-1 transition-all duration-300 ease-in-out rounded-md bg-background"
            style={{
              width: "calc(50% - 4px)",
              left:
                activeTab === "unread" ? "calc(0% + 4px)" : "calc(50% + 4px)",
            }}
          />
          {["unread", "read"].map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab}
              className={cn(
                "relative px-3 py-1.5 text-sm font-medium transition focus-visible:outline-2",
                "text-muted-foreground",
                "data-[state=active]:text-foreground"
              )}
            >
              <span className="relative z-10 capitalize">{tab}</span>
            </TabsTrigger>
          ))}
        </TabsList>
        <CardContent>
          <div className="flex -ml-6 flex-col space-y-4">
            <ScrollArea className="w-full h-[250px]">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification._id}
                  className="grid grid-cols-[25px_1fr] -ml-6 items-start gap-4 rounded-lg p-3 transition-colors hover:bg-muted/50"
                >
                  <span className="flex h-2 w-2 translate-y-1 rounded-full bg-transparent" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {notification.notificationBody}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatTimestamp(notification._creationTime)}
                    </p>
                    {activeTab === "unread" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => handleMarkAsRead(notification._id)}
                      >
                        Mark as Read
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </ScrollArea>
          </div>
          {hasMore && (
            <Button
              onClick={loadMore}
              className="mt-4 w-full"
              variant="outline"
            >
              Load More
            </Button>
          )}
        </CardContent>
      </Tabs>
    </Card>
  );
}

export default MyMessages;
