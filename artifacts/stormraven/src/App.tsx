import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';

import Dashboard from '@/pages/Dashboard';
import Realms from '@/pages/Realms';
import Modules from '@/pages/Modules';
import AuditLog from '@/pages/AuditLog';
import Terminal from '@/pages/Terminal';

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/realms" component={Realms} />
      <Route path="/modules" component={Modules} />
      <Route path="/audit" component={AuditLog} />
      <Route path="/terminal" component={Terminal} />
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
