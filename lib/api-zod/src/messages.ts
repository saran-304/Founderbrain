import { z } from 'zod';

export const MessageItem = z.object({
  id: z.string().uuid(),
  senderId: z.string().uuid(),
  recipientId: z.string().uuid(),
  content: z.string(),
  readAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
});

export const ListMessagesResponse = z.array(MessageItem);

export const CreateMessageBody = z.object({
  recipientId: z.string().uuid(),
  content: z.string().min(1).max(50000),
});

export const CreateMessageResponse = MessageItem;

export const ConversationItem = z.object({
  partnerId: z.string().uuid(),
  partnerName: z.string(),
  lastMessage: z.string(),
  updatedAt: z.coerce.date(),
  unreadCount: z.number(),
});

export const ListConversationsResponse = z.array(ConversationItem);
