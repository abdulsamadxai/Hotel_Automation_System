import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mockStore } from "@/lib/mockStore";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export interface Message {
    id: string;
    guest_id: string;
    guest_name?: string;
    guest_email?: string;
    guest_phone?: string;
    subject?: string;
    content?: string;
    message?: string;
    direction?: "inbound" | "outbound";
    channel?: "email" | "sms" | "whatsapp" | "internal";
    status: "sent" | "delivered" | "read" | "failed" | "pending" | "resolved";
    priority?: "low" | "medium" | "high";
    assigned_to?: string | null;
    created_at: string;
    updated_at?: string;
    guest?: {
        name: string;
        email: string;
        room_number?: string;
    };
}

export interface Conversation {
    guest_id: string;
    guest_name: string;
    last_message: string;
    last_message_at: string;
    unread_count: number;
    channel: "email" | "sms" | "whatsapp" | "internal";
}

export function useMessages(guestId: string | null) {
    const { hotelId } = useAuth();

    return useQuery({
        queryKey: ["messages", guestId, hotelId],
        queryFn: async () => {
            if (!guestId || !hotelId) return [];
            const allMessages = await mockStore.messages.getAll(hotelId);
            return allMessages.filter(m => m.guest_id === guestId);
        },
        enabled: !!guestId && !!hotelId,
    });
}

export function useConversations() {
    const { hotelId } = useAuth();

    return useQuery({
        queryKey: ["conversations", hotelId],
        queryFn: async () => {
            if (!hotelId) return [];
            const messages = await mockStore.messages.getAll(hotelId);
            const guests = await mockStore.guests.getAll(hotelId);

            // Group messages by guest
            const conversationMap = new Map<string, Message[]>();
            messages.forEach(msg => {
                if (!conversationMap.has(msg.guest_id)) {
                    conversationMap.set(msg.guest_id, []);
                }
                conversationMap.get(msg.guest_id)!.push(msg);
            });

            // Transform into conversation format
            const conversations: Conversation[] = [];
            conversationMap.forEach((msgs, guestId) => {
                const guest = guests.find(g => g.id === guestId);
                if (!guest) return;

                msgs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                const last = msgs[0];

                conversations.push({
                    guest_id: guestId,
                    guest_name: guest.name,
                    last_message: last.content || last.message || '',
                    last_message_at: last.created_at,
                    unread_count: msgs.filter(m => m.direction === 'inbound' && m.status !== 'read').length,
                    channel: last.channel || 'internal'
                });
            });

            return conversations.sort((a, b) =>
                new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
            );
        },
        enabled: !!hotelId,
    });
}

export function useSendMessage() {
    const queryClient = useQueryClient();
    const { hotelId } = useAuth();

    return useMutation({
        mutationFn: async (msg: { guest_id: string; content: string; channel: string }) => {
            return await mockStore.messages.create({
                ...msg,
                direction: 'outbound',
                status: 'sent'
            }, hotelId);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["messages", variables.guest_id] });
            queryClient.invalidateQueries({ queryKey: ["conversations"] });
            toast({ title: "Message sent" });
        },
    });
}

export function useDeleteConversation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (guestId: string) => {
            // Delete all messages for this guest - we'll need a special method
            const { hotelId } = useAuth();
            const messages = await mockStore.messages.getAll(hotelId);
            const guestMessages = messages.filter(m => m.guest_id === guestId);
            for (const msg of guestMessages) {
                await mockStore.messages.delete(msg.id);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["conversations"] });
            queryClient.invalidateQueries({ queryKey: ["messages"] });
            toast({ title: "Conversation deleted" });
        }
    });
}
