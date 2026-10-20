import { useState, useEffect, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'wouter';
import { Send, ArrowLeft } from 'lucide-react';
import { Button } from '@workspace/founderbrain-design-system/components/ui/button';
import { Input } from '@workspace/founderbrain-design-system/components/ui/input';
import { Card, CardContent } from '@workspace/founderbrain-design-system/components/ui/card';
import { toast } from '@workspace/founderbrain-design-system/hooks/use-toast';
import { PageHeading, LoadingBlock, QueryError } from '@/components/workspace';
import { customFetch } from '@workspace/api-client-react';

export function MessagesPage() {
    const { recipientId } = useParams<{ recipientId: string }>();
    const [message, setMessage] = useState('');

    // In a real implementation, these would use generated hooks
    const { data: messages, isLoading, isError, refetch } = useQuery({
        queryKey: ['messages', recipientId],
        queryFn: () => customFetch(`/api/messages/${recipientId}`),
        enabled: !!recipientId,
    });

    const sendMessage = useMutation({
        mutationFn: (content: string) => customFetch('/api/messages', {
            method: 'POST',
            body: JSON.stringify({ recipientId, content })
        }),
        onSuccess: () => {
            setMessage('');
            refetch();
        },
        onError: () => toast({ title: 'Could not send message', variant: 'destructive' })
    });

    if (!recipientId) return <div>Select a conversation</div>;
    if (isLoading) return <LoadingBlock title="Loading messages" />;
    if (isError) return <QueryError onRetry={refetch} />;

    return (
        <div className="max-w-4xl mx-auto py-8">
            <PageHeading title="Messages" description="Your conversation." />
            <div className="h-96 overflow-y-auto border p-4 mb-4">
                {(messages as any[])?.map((m: any) => (
                    <div key={m.id} className={`mb-2 p-2 rounded ${m.senderId === recipientId ? 'bg-secondary' : 'bg-primary text-primary-foreground'}`}>
                        {m.content}
                    </div>
                ))}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); sendMessage.mutate(message); }} className="flex gap-2">
                <Input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type a message..." />
                <Button type="submit" disabled={sendMessage.isPending}>Send <Send className="ml-2 h-4 w-4" /></Button>
            </form>
        </div>
    );
}
