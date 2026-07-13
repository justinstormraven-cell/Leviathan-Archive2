import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Router as WouterRouter } from 'wouter';
import ReplitAuthGate from '@/desktop/ReplitAuthGate';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {/* WouterRouter kept so legacy pages' <Link> elements still resolve
            when rendered as windowed apps; routing itself is handled by the
            StormRaven desktop shell. */}
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <ReplitAuthGate />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
