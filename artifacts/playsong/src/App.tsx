import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { RoomProvider } from "@/contexts/RoomContext";
import { useEffect } from "react";

// Mock imports for pages
import Home from "@/pages/Home";
import Host from "@/pages/Host";
import Join from "@/pages/Join";
import Guest from "@/pages/Guest";
import Display from "@/pages/Display";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/host" component={Host} />
      <Route path="/join" component={Join} />
      <Route path="/guest/:roomCode" component={Guest} />
      <Route path="/display/:roomCode" component={Display} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <RoomProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </RoomProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
