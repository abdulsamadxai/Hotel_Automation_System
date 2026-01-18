
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface Message {
    id: string;
    guest_id: string;
    content: string;
    direction: "inbound" | "outbound";
    channel: "email" | "sms" | "whatsapp" | "internal";
    status: "sent" | "delivered" | "read" | "failed";
    created_at: string;
    guest?: {
        name: string;
        email: string;
        room_number?: string; // specific logic might be needed to join room
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

// Fetch all messages for a specific guest
export function useMessages(guestId: string | null) {
    return useQuery({
        queryKey: ["messages", guestId],
        queryFn: async () => {
            if (!guestId) return [];
            // @ts-ignore
            const { data, error } = await supabase
                .from("messages") // Table not in types yet
                .select("*")
                .eq("guest_id", guestId)
                .order("created_at", { ascending: true });

            if (error) throw error;
            return data as Message[];
        },
        enabled: !!guestId,
    });
}

// Fetch list of "Conversations" (grouped by guest)
// Note: Supabase doesn't support complex GROUP BY in client easily, 
// so we might fetch all latest messages or use an RPC. 
// For now, we'll fetch unique guests who have messages.
export function useConversations() {
    return useQuery({
        queryKey: ["conversations"],
        queryFn: async () => {
            // enhanced query to get guests with their latest message
            const { data, error } = await supabase
                .from("guests")
                .select(`
          id, 
          name, 
          email,
          messages (
            id, content, created_at, direction, status, channel
          )
        `);

            if (error) throw error;

            // Transform into conversation format
            // @ts-ignore
            const conversations: Conversation[] = data
                .map((guest: any) => {
                    const msgs = (guest.messages || []) as Message[];
                    if (msgs.length === 0) return null;

                    // Sort desc
                    msgs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                    const last = msgs[0];

                    return {
                        guest_id: guest.id,
                        guest_name: guest.name,
                        last_message: last.content,
                        last_message_at: last.created_at,
                        unread_count: msgs.filter(m => m.direction === 'inbound' && m.status !== 'read').length,
                        channel: last.channel
                    };
                })
                .filter((c: any): c is Conversation => c !== null)
                .sort((a: any, b: any) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());

            return conversations;
        },
    });
}

export function useSendMessage() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (msg: { guest_id: string; content: string; channel: string }) => {
            // @ts-ignore
            const { data, error } = await supabase
                .from("messages")
                .insert({
                    guest_id: msg.guest_id,
                    content: msg.content,
                    channel: msg.channel,
                    direction: 'outbound',
                    status: 'sent'
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["messages", variables.guest_id] });
            queryClient.invalidateQueries({ queryKey: ["conversations"] });
            toast({ title: "Message sent" });
        },
    });
}

export function useDeleteConversation() { // Just deletes all messages for a guest for now
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (guestId: string) => {
            // @ts-ignore
            const { error } = await supabase
                .from("messages")
                .delete()
                .eq("guest_id", guestId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["conversations"] });
            queryClient.invalidateQueries({ queryKey: ["messages"] });
            toast({ title: "Conversation deleted" });
        }
    })
}
