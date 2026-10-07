export type Conversation = {
    id: string;
    kind: 'direct' | 'partner';
    display_name: string;
    last_sequence: number;
    unread: number;
    job_ids: string[];
};
export type Message = {
    id: string;
    conversation_id: string;
    sequence: number;
    sender_id: string | null;
    body: string;
    asset_id: string | null;
    job_id: string | null;
    created_at: string;
};
export type MessageInput = {
    client_message_id: string;
    body: string;
    job_id?: string;
};
