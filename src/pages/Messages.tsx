import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Send, MessageSquare, User, Phone, Mail } from "lucide-react";
import { useState } from "react";

interface Message {
  id: string;
  guestId: string;
  guestName: string;
  channel: "email" | "sms" | "whatsapp" | "internal";
  direction: "inbound" | "outbound";
  content: string;
  timestamp: string;
  status: "sent" | "delivered" | "read" | "pending";
}

interface Conversation {
  id: string;
  guestName: string;
  guestRoom?: string;
  lastMessage: string;
  lastMessageTime: string;
  unread: number;
  channel: "email" | "sms" | "whatsapp" | "internal";
}

const mockConversations: Conversation[] = [
  {
    id: "C-001",
    guestName: "John Smith",
    guestRoom: "412",
    lastMessage: "Thank you for the late checkout request confirmation",
    lastMessageTime: "10:30 AM",
    unread: 0,
    channel: "email",
  },
  {
    id: "C-002",
    guestName: "Sarah Johnson",
    guestRoom: "305",
    lastMessage: "Can I get extra towels please?",
    lastMessageTime: "09:45 AM",
    unread: 1,
    channel: "sms",
  },
  {
    id: "C-003",
    guestName: "Michael Brown",
    lastMessage: "Confirmation for booking #BK-006",
    lastMessageTime: "Yesterday",
    unread: 0,
    channel: "email",
  },
  {
    id: "C-004",
    guestName: "Emily Davis",
    guestRoom: "512",
    lastMessage: "The AC is not working properly",
    lastMessageTime: "Yesterday",
    unread: 2,
    channel: "whatsapp",
  },
];

const mockMessages: Message[] = [
  {
    id: "M-001",
    guestId: "G-002",
    guestName: "Sarah Johnson",
    channel: "sms",
    direction: "inbound",
    content: "Can I get extra towels please?",
    timestamp: "09:45 AM",
    status: "read",
  },
  {
    id: "M-002",
    guestId: "G-002",
    guestName: "Sarah Johnson",
    channel: "sms",
    direction: "outbound",
    content: "Of course! We'll send them up right away. Is there anything else you need?",
    timestamp: "09:50 AM",
    status: "delivered",
  },
  {
    id: "M-003",
    guestId: "G-002",
    guestName: "Sarah Johnson",
    channel: "sms",
    direction: "inbound",
    content: "Can I get extra towels please?",
    timestamp: "10:30 AM",
    status: "read",
  },
];

const channelIcons = {
  email: Mail,
  sms: MessageSquare,
  whatsapp: Phone,
  internal: User,
};

const channelColors = {
  email: "bg-status-info/15 text-status-info",
  sms: "bg-status-success/15 text-status-success",
  whatsapp: "bg-status-success/15 text-status-success",
  internal: "bg-muted text-muted-foreground",
};

export default function Messages() {
  const [selectedConversation, setSelectedConversation] = useState<string | null>("C-002");

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Messages</h1>
            <p className="text-muted-foreground">
              Guest communication center (placeholder for external APIs)
            </p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Message
          </Button>
        </div>

        {/* Info Banner */}
        <div className="glass-card p-4 border-status-info/30 bg-status-info/5">
          <p className="text-sm text-status-info">
            <strong>Note:</strong> This is a placeholder interface. External messaging APIs (WhatsApp, SMS, Email) are not connected. Messages are stored locally for demonstration.
          </p>
        </div>

        {/* Messages Interface */}
        <div className="glass-card overflow-hidden h-[600px] flex">
          {/* Conversation List */}
          <div className="w-80 border-r border-border flex flex-col">
            <div className="p-4 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search conversations..."
                  className="pl-10 bg-muted/50 border-0"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {mockConversations.map((conv) => {
                const ChannelIcon = channelIcons[conv.channel];
                return (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv.id)}
                    className={`w-full p-4 text-left hover:bg-muted/30 transition-colors border-b border-border ${
                      selectedConversation === conv.id ? "bg-muted/50" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium shrink-0">
                        {conv.guestName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium truncate">{conv.guestName}</p>
                          <span className="text-xs text-muted-foreground">
                            {conv.lastMessageTime}
                          </span>
                        </div>
                        {conv.guestRoom && (
                          <p className="text-xs text-muted-foreground">
                            Room {conv.guestRoom}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground truncate mt-1">
                          {conv.lastMessage}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${channelColors[conv.channel]}`}
                          >
                            <ChannelIcon className="h-2.5 w-2.5 mr-1" />
                            {conv.channel}
                          </Badge>
                          {conv.unread > 0 && (
                            <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">
                              {conv.unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Message Thread */}
          <div className="flex-1 flex flex-col">
            {selectedConversation ? (
              <>
                {/* Conversation Header */}
                <div className="p-4 border-b border-border">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                      SJ
                    </div>
                    <div>
                      <p className="font-medium">Sarah Johnson</p>
                      <p className="text-xs text-muted-foreground">
                        Room 305 • Guest
                      </p>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {mockMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${
                        msg.direction === "outbound" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[70%] p-3 rounded-xl ${
                          msg.direction === "outbound"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <p className="text-sm">{msg.content}</p>
                        <p
                          className={`text-[10px] mt-1 ${
                            msg.direction === "outbound"
                              ? "text-primary-foreground/70"
                              : "text-muted-foreground"
                          }`}
                        >
                          {msg.timestamp}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Input */}
                <div className="p-4 border-t border-border">
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Type a message..."
                      className="min-h-[44px] max-h-32 bg-muted/50 border-0 resize-none"
                    />
                    <Button size="icon" className="shrink-0">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                Select a conversation to view messages
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
