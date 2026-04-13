import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { getActiveDrug, getVisibleDrugs } from '../../lib/state';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  LogOutIcon, EllipsisVerticalIcon,
  LayoutDashboardIcon, SlidersVerticalIcon, TableIcon, TrendingUpIcon,
  GitCompareArrowsIcon, LayoutGridIcon,
} from 'lucide-react';

function formatLoeDate(loeDate: string) {
  const [year, month] = loeDate.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(month) - 1]} ${year}`;
}

const REGION_COLORS: Record<string, string> = {
  nordics: 'bg-blue-500/20 text-blue-300',
  uk:      'bg-green-500/20 text-green-300',
  germany: 'bg-yellow-500/20 text-yellow-300',
};

function NavUser() {
  const { state, logout } = useApp();
  const navigate = useNavigate();
  const { isMobile } = useSidebar();
  const initials = state.user?.name.split(' ').map(n => n[0]).join('') ?? 'U';

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="size-8 rounded-lg">
                <AvatarFallback className="rounded-lg bg-primary/40 text-sidebar-foreground text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{state.user?.name}</span>
                <span className="truncate text-xs text-muted-foreground">{state.user?.company}</span>
              </div>
              <EllipsisVerticalIcon className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="size-8 rounded-lg">
                  <AvatarFallback className="rounded-lg bg-primary text-primary-foreground text-xs font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{state.user?.name}</span>
                  <span className="truncate text-xs text-muted-foreground">{state.user?.company}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => { logout(); navigate('/'); }}>
              <LogOutIcon />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

export default function AppSidebar() {
  const { state, setActiveDrug, setActiveRegion } = useApp();
  const location = useLocation();
  const entry = getActiveDrug(state);
  const drug = entry?.scenarios.base.drug;
  const visibleDrugs = getVisibleDrugs(state);
  const isGlobal = state.user?.role === 'global';

  const region = state.regions.find(r => r.id === entry?.regionId);

  const NAV_ITEMS = [
    { to: '/dashboard', label: 'Dashboard',       Icon: LayoutDashboardIcon },
    { to: '/inputs',    label: 'Forecast Inputs', Icon: SlidersVerticalIcon },
    { to: '/sales',     label: 'Sales',           Icon: TrendingUpIcon },
    { to: '/pl',        label: 'P&L',             Icon: TableIcon },
    { to: '/analog',    label: 'Analogs',         Icon: GitCompareArrowsIcon },
    ...(isGlobal ? [{ to: '/portfolio', label: 'Portfolio', Icon: LayoutGridIcon }] : []),
  ];

  return (
    <Sidebar collapsible="offcanvas">
      {/* Logo */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="data-[slot=sidebar-menu-button]:p-1.5!">
              <div className="size-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                  <path d="M3 14L8 9L11 12L17 6" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="17" cy="6" r="2" fill="white"/>
                </svg>
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">Align Strategy</span>
                <span className="truncate text-xs text-muted-foreground">LOE Platform</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Active asset */}
        <SidebarGroup>
          <SidebarGroupLabel>Active Asset</SidebarGroupLabel>

          {/* Drug switcher (only when >1 drug visible) */}
          {visibleDrugs.length > 1 ? (
            <div className="px-2 pb-2">
              <Select
                value={state.activeDrugId}
                onValueChange={setActiveDrug}
              >
                <SelectTrigger className="w-full h-9 text-xs bg-sidebar-accent/30 border-sidebar-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {visibleDrugs.map(d => {
                    const r = state.regions.find(r => r.id === d.regionId);
                    return (
                      <SelectItem key={d.id} value={d.id}>
                        <div className="flex items-center gap-2">
                          <span>{d.scenarios.base.drug.drugName}</span>
                          {r && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${REGION_COLORS[r.id] ?? 'bg-muted text-muted-foreground'}`}>
                              {r.name}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="px-2 pb-2 flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-sidebar-foreground">{drug?.drugName ?? '—'}</p>
                <p className="text-xs text-sidebar-foreground/50 mt-0.5">
                  LOE: {drug ? formatLoeDate(drug.loeDate) : '—'}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge className="text-[10px] bg-primary/30 text-primary-foreground border-0 flex-shrink-0 mt-0.5">LOE</Badge>
                {region && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${REGION_COLORS[region.id] ?? 'bg-muted'}`}>
                    {region.name}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Region filter (global users only) */}
          {isGlobal && (
            <div className="px-2 pb-1">
              <Select
                value={state.activeRegionId ?? 'all'}
                onValueChange={v => setActiveRegion(v === 'all' ? undefined : v)}
              >
                <SelectTrigger className="w-full h-7 text-xs border-sidebar-border">
                  <SelectValue placeholder="All Regions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Regions</SelectItem>
                  {state.regions.map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </SidebarGroup>

        <SidebarSeparator />

        {/* Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map(({ to, label, Icon }) => (
                <SidebarMenuItem key={to}>
                  <SidebarMenuButton asChild isActive={location.pathname === to} tooltip={label}>
                    <NavLink to={to}>
                      <Icon />
                      <span>{label}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
