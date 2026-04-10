import { useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import AppSidebar from './Sidebar';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';

function formatLoeDate(loeDate: string): string {
  const [year, month] = loeDate.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(month) - 1]} ${year}`;
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { state } = useApp();
  const location = useLocation();
  const pageTitle = location.pathname === '/dashboard' ? 'Dashboard' : 'Forecast Inputs';
  const initials = state.user?.name.split(' ').map(n => n[0]).join('') ?? 'U';

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
          <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
            <div className="flex flex-1 items-center justify-between min-w-0">
              <div className="min-w-0">
                <h1 className="text-base font-medium truncate">{pageTitle}</h1>
                <p className="text-xs text-muted-foreground truncate hidden sm:block">
                  {state.scenarios.base.drug.drugName} · LOE {formatLoeDate(state.scenarios.base.drug.loeDate)}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                <Badge variant={state.activeScenario === 'base' ? 'default' : 'destructive'} className="text-xs hidden sm:inline-flex">
                  {state.activeScenario === 'base' ? 'Base Case' : 'Alternate Case'}
                </Badge>
                <div className="hidden md:flex flex-col items-end">
                  <span className="text-xs font-medium leading-none">{state.user?.name}</span>
                  <span className="text-xs text-muted-foreground mt-0.5">{state.user?.title}</span>
                </div>
                <Avatar className="size-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
          </div>
        </header>
        <div className="@container/main flex flex-1 flex-col overflow-y-auto">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
