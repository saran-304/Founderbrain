import { useEffect, useRef, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { AuthProvider } from '@/contexts/auth-context';
import { Toaster } from '@workspace/founderbrain-design-system/components/ui/toaster';
import { TooltipProvider } from '@workspace/founderbrain-design-system/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import AuthPage from '@/pages/auth';
import { EmailVerificationCallbackPage, PasswordUpdatePage } from '@/pages/auth-return';
import DashboardPage from '@/pages/dashboard';
import SettingsPage from '@/pages/settings';
import AboutPage from '@/pages/about';
import { MessagesPage } from '@/pages/messages';
import {
  TeamsPage, FoundersPage, CommunityPage, PortfolioPage, PublicPortfolioPage, MentorshipPage, NotificationsPage,
} from '@/pages/network';
import { AssistantsPage, FundraisingPage } from '@/pages/operating';
import { GoalsPage, GoalDetailPage, ProjectsPage, ProjectDetailPage, TasksPage, TaskDetailPage } from '@/pages/resources';
import { AuthGate, WorkspaceShell } from '@/components/workspace';
import { useAuth } from '@/contexts/auth-context';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();

function SessionCacheManager() {
  const { user, isLoading } = useAuth();
  const previousUserId = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (isLoading) return;
    const nextId = user?.id ?? null;
    if (previousUserId.current !== undefined && previousUserId.current !== nextId) {
      queryClient.clear();
    }
    previousUserId.current = nextId;
  }, [user?.id, isLoading]);
  return null;
}

function Home() {
  const { user, isLoading, isConfigured } = useAuth();
  const [, navigate] = useLocation();
  useEffect(() => {
    if (!isLoading) navigate(isConfigured && user ? '/dashboard' : '/login');
  }, [isLoading, isConfigured, user, navigate]);
  return null;
}

function AuthRoute({ mode }: { mode: 'login' | 'signup' | 'forgot' }) {
  const { user, isLoading, isConfigured } = useAuth();
  const [, navigate] = useLocation();
  useEffect(() => {
    if (!isLoading && isConfigured && user) navigate('/dashboard');
  }, [isLoading, isConfigured, user, navigate]);
  if (isLoading || (isConfigured && user)) return null;
  return <AuthPage mode={mode} />;
}

function Protected({ children }: { children: ReactNode }) {
  return <AuthGate><WorkspaceShell>{children}</WorkspaceShell></AuthGate>;
}

function Router() {
  return (
    // Keep a shared shell (sidebar, navbar) outside the boundary so it
    // survives a page crash.
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/login"><AuthRoute mode="login" /></Route>
        <Route path="/signup"><AuthRoute mode="signup" /></Route>
        <Route path="/forgot-password"><AuthRoute mode="forgot" /></Route>
        <Route path="/auth/callback" component={EmailVerificationCallbackPage} />
        <Route path="/update-password" component={PasswordUpdatePage} />
        <Route path="/dashboard"><Protected><DashboardPage /></Protected></Route>
        <Route path="/projects"><Protected><ProjectsPage /></Protected></Route>
        <Route path="/projects/:projectId"><Protected><ProjectDetailPage /></Protected></Route>
        <Route path="/tasks"><Protected><TasksPage /></Protected></Route>
        <Route path="/tasks/:taskId"><Protected><TaskDetailPage /></Protected></Route>
        <Route path="/goals"><Protected><GoalsPage /></Protected></Route>
        <Route path="/goals/:goalId"><Protected><GoalDetailPage /></Protected></Route>
        <Route path="/teams"><Protected><TeamsPage /></Protected></Route>
        <Route path="/founders"><Protected><FoundersPage /></Protected></Route>
        <Route path="/community"><Protected><CommunityPage /></Protected></Route>
        <Route path="/portfolio/:founderId"><PublicPortfolioPage /></Route>
        <Route path="/portfolio"><Protected><PortfolioPage /></Protected></Route>
        <Route path="/mentorship"><Protected><MentorshipPage /></Protected></Route>
        <Route path="/assistants"><Protected><AssistantsPage /></Protected></Route>
        <Route path="/fundraising"><Protected><FundraisingPage /></Protected></Route>
        <Route path="/notifications"><Protected><NotificationsPage /></Protected></Route>
        <Route path="/messages/:recipientId"><Protected><MessagesPage /></Protected></Route>
        <Route path="/settings"><Protected><SettingsPage /></Protected></Route>
        <Route path="/about" component={AboutPage} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <SessionCacheManager />
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
