import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, hotelParams, writeHotelParams } from "@/lib/api";
import type { Message as CanonicalMessage, MessageChannel, MessageDirection, MessageCreateInput } from "@/lib/types";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export type { MessageChannel, MessageDirection } from "@/lib/types";

/** Canonical message: `message` body + `direction` (no `content`). */
export type Message = CanonicalMessage;

export interface Conversation {
    guest_id: string;
    guest_name: string;
    last_message: string;
    last_message_at: string;
    unread_count: number;
    channel: MessageChannel;
}

function toErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : "An unknown error occurred";
}

export function useMessages(guestId: string | null) {
    const { hotelId } = useAuth();

    return useQuery({
        queryKey: ["messages", guestId, hotelId],
        queryFn: async () => {
            if (!guestId || !hotelId) return [];
            return await api.get<Message[]>("/api/messages", { ...hotelParams(hotelId), guest_id: guestId });
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
            const messages = await api.get<Message[]>("/api/messages", hotelParams(hotelId));
            const guests = await api.get<Array<{ id: string; name: string }>>("/api/guests", hotelParams(hotelId));

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
                    last_message: last.message,
                    last_message_at: last.created_at,
                    // Unread = inbound messages that have not been read.
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
    const { role, hotelId } = useAuth();

    return useMutation({
        mutationFn: async (msg: { guest_id: string; message: string; channel?: MessageChannel }) => {
            const input: MessageCreateInput = {
                guest_id: msg.guest_id,
                message: msg.message,
                channel: msg.channel,
                direction: 'outbound',
                status: 'sent',
                ...writeHotelParams(role, hotelId),
            };
            return await api.post<Message>("/api/messages", input);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["messages", variables.guest_id] });
            queryClient.invalidateQueries({ queryKey: ["conversations"] });
            toast({ title: "Message sent" });
        },
        onError: (error: unknown) => {
            toast({ title: "Error sending message", description: toErrorMessage(error), variant: "destructive" });
        },
    });
}

export function useDeleteConversation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (guestId: string) => {
            const messages = await api.get<Message[]>("/api/messages", { guest_id: guestId });
            for (const msg of messages) {
                await api.del(`/api/messages/${msg.id}`);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["conversations"] });
            queryClient.invalidateQueries({ queryKey: ["messages"] });
            toast({ title: "Conversation deleted" });
        },
        onError: (error: unknown) => {
            toast({ title: "Error deleting conversation", description: toErrorMessage(error), variant: "destructive" });
        },
    });
}
