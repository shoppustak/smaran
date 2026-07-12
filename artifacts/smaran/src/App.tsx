import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import Dashboard from '@/pages/dashboard';
import Roster from '@/pages/roster';
import Recover from '@/pages/recover';
import Protect from '@/pages/protect';
import Collect from '@/pages/collect';
import AddEntry from '@/pages/add';
import Referral from '@/pages/referral';
import Settings from '@/pages/settings';
import YajmanDetail from '@/pages/yajman-detail';
import Onboarding from '@/pages/onboarding';
import { Route, Switch, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/roster" component={Roster} />
      <Route path="/roster/:id" component={YajmanDetail} />
      <Route path="/recover" component={Recover} />
      <Route path="/protect" component={Protect} />
      <Route path="/collect" component={Collect} />
      <Route path="/add" component={AddEntry} />
      <Route path="/referral" component={Referral} />
      <Route path="/settings" component={Settings} />
      <Route path="/onboarding" component={Onboarding} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
