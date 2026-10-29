import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { ArrowRight, Command, MessageSquare, Plus, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@workspace/founderbrain-design-system/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/founderbrain-design-system/components/ui/card';
import { Badge } from '@workspace/founderbrain-design-system/components/ui/badge';
import { Textarea } from '@workspace/founderbrain-design-system/components/ui/textarea';
import { useAuth } from '@/contexts/auth-context';
import { toast } from '@workspace/founderbrain-design-system/hooks/use-toast';

type FeedbackPost = {
  id: string;
  authorId: string;
  authorName: string;
  message: string;
  category: string;
  status: string;
  createdAt: string;
};

const categoryLabels: Record<string, string> = {
  idea: 'Idea',
  bug_report: 'Bug Report',
  feature_request: 'Feature Request',
  general_feedback: 'General Feedback',
};

const categoryColors: Record<string, string> = {
  idea: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  bug_report: 'bg-red-500/10 text-red-700 dark:text-red-400',
  feature_request: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
  general_feedback: 'bg-green-500/10 text-green-700 dark:text-green-400',
};

export default function FeedbackPage() {
  const { user } = useAuth();
  const [feedback, setFeedback] = useState<FeedbackPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('general_feedback');
  const [filter, setFilter] = useState<string | undefined>(undefined);

  const loadFeedback = async () => {
    setLoading(true);
    try {
      const url = filter ? `/api/feedback?category=${filter}` : '/api/feedback';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to load feedback');
      const data = await response.json();
      setFeedback(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Could not load feedback. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to submit feedback.',
        variant: 'destructive',
      });
      return;
    }

    if (message.trim().length === 0) {
      toast({
        title: 'Message Required',
        description: 'Please enter your feedback message.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message.trim(), category }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit feedback');
      }

      toast({
        title: 'Feedback Submitted',
        description: 'Thank you! Your feedback has been submitted for review.',
      });
      setMessage('');
      loadFeedback();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Could not submit feedback. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (feedbackId: string) => {
    if (!user) return;

    if (!confirm('Are you sure you want to delete this feedback?')) return;

    try {
      const response = await fetch(`/api/feedback/${feedbackId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete feedback');
      }

      toast({
        title: 'Feedback Deleted',
        description: 'Your feedback has been deleted.',
      });
      loadFeedback();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Could not delete feedback. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Load feedback on mount and when filter changes
  useEffect(() => {
    loadFeedback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const timeAgo = (date: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border/70 bg-card/70 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
          <Link href="/" className="flex items-center gap-3" aria-label="FounderBrain home">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Command className="h-5 w-5" />
            </span>
            <span className="text-lg font-semibold tracking-tight">FounderBrain</span>
          </Link>
          <nav className="flex items-center gap-3">
            <Link href="/" className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              Home
            </Link>
            {user ? (
              <Link href="/dashboard" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90">
                Dashboard
              </Link>
            ) : (
              <Link href="/login" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90">
                Sign In
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-12 sm:px-8 sm:py-16">
        {/* Page Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Feedback Wall
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Share your ideas, report bugs, and help us improve FounderBrain.
          </p>
        </div>

        {/* Submit Feedback Form */}
        {user && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Submit Feedback
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Category</label>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(categoryLabels).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setCategory(value)}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                          category === value
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Your Feedback</label>
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Share your thoughts, ideas, or report an issue..."
                    rows={4}
                    maxLength={2000}
                  />
                  <div className="mt-1 text-xs text-muted-foreground text-right">
                    {message.length}/2000
                  </div>
                </div>
                <Button type="submit" disabled={submitting || message.trim().length === 0}>
                  {submitting ? 'Submitting...' : 'Submit Feedback'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {!user && (
          <Card className="mb-8 border-2 border-dashed">
            <CardContent className="p-6 text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Sign In to Submit Feedback</h3>
              <p className="text-muted-foreground mb-4">
                Join FounderBrain to share your ideas and help us improve the platform.
              </p>
              <Button asChild>
                <Link href="/login">
                  Sign In
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Filter */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">Filter:</span>
          <button
            onClick={() => setFilter(undefined)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              filter === undefined
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            All
          </button>
          {Object.entries(categoryLabels).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filter === value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Feedback List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-muted rounded w-1/4 mb-3" />
                  <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : feedback.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Feedback Yet</h3>
              <p className="text-muted-foreground">
                Be the first to share your thoughts and help us improve FounderBrain.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {feedback.map((post) => (
              <Card key={post.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary text-sm font-semibold">
                        {post.authorName.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium">{post.authorName}</div>
                        <div className="text-xs text-muted-foreground">{timeAgo(post.createdAt)}</div>
                      </div>
                    </div>
                    <Badge className={categoryColors[post.category] || ''}>
                      {categoryLabels[post.category] || post.category}
                    </Badge>
                  </div>
                  <p className="text-sm leading-relaxed">{post.message}</p>
                  {user && user.id === post.authorId && (
                    <div className="mt-4 pt-4 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(post.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/70 py-8 text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} FounderBrain. Built for founders, by founders.</p>
      </footer>
    </div>
  );
}
