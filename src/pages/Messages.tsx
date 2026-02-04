import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Send, MessageSquare, User, Phone, Mail, Loader2, Trash2, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { useConversations, useMessages, useSendMessage, useDeleteConversation, Conversation, Message } from "@/hooks/useMessages";
import { formatDistanceToNow } from "date-fns";

const channelIcons: any = {
  email: Mail,
  sms: MessageSquare,
  whatsapp: Phone,
  internal: User,
};

const channelColors: any = {
  email: "bg-status-info/15 text-status-info",
  sms: "bg-status-success/15 text-status-success",
  whatsapp: "bg-status-success/15 text-status-success",
  internal: "bg-muted text-muted-foreground",
};

export default function Messages() {
  const { data: conversations = [], isLoading: loadingConvos, refetch: refetchConvos } = useConversations();
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
  const { data: messages = [], isLoading: loadingMessages, refetch: refetchMessages } = useMessages(selectedGuestId);
  const sendMessage = useSendMessage();
  const deleteConversation = useDeleteConversation();

  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const filteredConversations = conversations.filter(c =>
    (c.guest_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    // Select first conversation by default if available and none selected
    if (!selectedGuestId && conversations.length > 0) {
      setSelectedGuestId(conversations[0]?.guest_id);
    }
  }, [conversations, selectedGuestId]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedGuestId) return;

    // Find channel from selected conversation or default to sms
    const currentConvo = conversations.find(c => c.guest_id === selectedGuestId);

    await sendMessage.mutateAsync({
      guest_id: selectedGuestId,
      content: newMessage,
      channel: currentConvo?.channel || 'sms'
    });

    setNewMessage("");
  };

  const handleDeleteConversation = async (e: React.MouseEvent, guestId: string) => {
    e.stopPropagation();
    if (confirm("Delete this entire conversation?")) {
      await deleteConversation.mutateAsync(guestId);
      if (selectedGuestId === guestId) setSelectedGuestId(null);
    }
  }

  const activeConversation = conversations.find(c => c.guest_id === selectedGuestId);

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Messages</h1>
            <p className="text-muted-foreground">
              Guest communication center
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => { refetchConvos(); refetchMessages(); }}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
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
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loadingConvos ? (
                <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">No conversations found.</div>
              ) : (
                filteredConversations.map((conv) => {
                  const ChannelIcon = channelIcons[conv.channel] || MessageSquare;
                  return (
                    <button
                      key={conv.guest_id}
                      onClick={() => setSelectedGuestId(conv.guest_id)}
                      className={`w-full p-4 text-left hover:bg-muted/30 transition-colors border-b border-border group relative ${selectedGuestId === conv.guest_id ? "bg-muted/50" : ""
                        }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium shrink-0">
                          {conv.guest_name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium truncate">{conv.guest_name}</p>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true })}
                            </span>
                          </div>

                          <p className="text-sm text-muted-foreground truncate mt-1">
                            {conv.last_message}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${channelColors[conv.channel] || "bg-muted"}`}
                            >
                              <ChannelIcon className="h-2.5 w-2.5 mr-1" />
                              {conv.channel}
                            </Badge>
                            {conv.unread_count > 0 && (
                              <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">
                                {conv.unread_count}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="absolute right-2 bottom-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={(e) => handleDeleteConversation(e, conv.guest_id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Message Thread */}
          <div className="flex-1 flex flex-col">
            {selectedGuestId ? (
              <>
                {/* Conversation Header */}
                <div className="p-4 border-b border-border bg-background/50 backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                      {(activeConversation?.guest_name || 'Guest').substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">{activeConversation?.guest_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Guest
                      </p>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/5">
                  {loadingMessages ? (
                    <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>
                  ) : messages.length === 0 ? (
                    <div className="text-center text-muted-foreground mt-10">No messages yet.</div>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.direction === "outbound" ? "justify-end" : "justify-start"
                          }`}
                      >
                        <div
                          className={`max-w-[70%] p-3 rounded-xl shadow-sm ${msg.direction === "outbound"
                            ? "bg-primary text-primary-foreground"
                            : "bg-card border border-border"
                            }`}
                        >
                          <p className="text-sm">{msg.content}</p>
                          <div className={`flex items-center gap-1 mt-1 justify-end ${msg.direction === "outbound" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                            <span className="text-[10px]">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {msg.direction === "outbound" && (
                              <span className="text-[10px] ml-1 uppercase font-bold tracking-wider opacity-80">{msg.status}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Input */}
                <div className="p-4 border-t border-border bg-background">
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Type a message..."
                      className="min-h-[44px] max-h-32 bg-muted/50 border-0 resize-none focus-visible:ring-1"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                    />
                    <Button size="icon" className="shrink-0 h-11 w-11" onClick={handleSendMessage} disabled={sendMessage.isPending || !newMessage.trim()}>
                      {sendMessage.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center bg-muted/5">
                <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <MessageSquare className="h-8 w-8 opacity-50" />
                </div>
                <h3 className="font-semibold text-lg text-foreground mb-1">Your Messages</h3>
                <p>Select a conversation from the left to view history.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
