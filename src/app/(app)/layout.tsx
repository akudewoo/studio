
'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  useSidebar,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  CircleDollarSign,
  Package,
  ShoppingCart,
  Store,
  Truck,
  Warehouse,
  FileText,
  LayoutDashboard,
  Newspaper,
  ChevronDown,
  Building,
  LogOut,
  Book,
} from 'lucide-react';
import { Logo } from '@/components/icons/logo';
import { BranchProvider, useBranch } from '@/hooks/use-branch';
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';

const navItems = [
  { href: '/dashboard', label: 'Dasbor', icon: LayoutDashboard },
  { href: '/produk', label: 'Daftar Produk', icon: Package },
  { href: '/kios', label: 'Data Kios', icon: Store },
  { href: '/penebusan', label: 'Penebusan', icon: ShoppingCart },
  { href: '/pengeluaran-do', label: 'Pengeluaran DO', icon: Truck },
  { href: '/penyaluran-kios', label: 'Penyaluran Kios', icon: Warehouse },
  { href: '/pembayaran', label: 'Pembayaran', icon: CircleDollarSign },
  { href: '/kas-umum', label: 'Kas Umum', icon: Book },
  { href: '/ringkasan-harian', label: 'Ringkasan Harian', icon: Newspaper },
  { href: '/laporan', label: 'Laporan', icon: FileText },
];

const BranchSelector = () => {
    const { branches, activeBranch, setActiveBranch, loading, allBranchesOption } = useBranch();
    const { user } = useAuth();
    const [popoverOpen, setPopoverOpen] = React.useState(false);

    if (loading) {
        return (
            <div className="p-2">
                <Skeleton className="h-10 w-full" />
            </div>
        )
    }

    // Hide selector if user is not an owner
    if (user?.role !== 'owner') {
        return (
            <div className="p-2">
                <Button
                    variant="outline"
                    className="h-10 w-full justify-start px-2 group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
                    disabled
                >
                    <Building className="size-5 shrink-0" />
                    <div className="ml-2 flex flex-col items-start group-data-[collapsible=icon]:hidden">
                        <span className="text-xs text-muted-foreground">Cabang</span>
                        <span className="text-sm font-semibold">{activeBranch?.name || '...'}</span>
                    </div>
                </Button>
            </div>
        )
    }

    return (
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className="h-10 w-full justify-start px-2 group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
                >
                    <Building className="size-5 shrink-0" />
                    <div className="ml-2 flex flex-col items-start group-data-[collapsible=icon]:hidden">
                        <span className="text-xs text-muted-foreground">Cabang</span>
                        <span className="text-sm font-semibold">{activeBranch?.name || 'Pilih Cabang'}</span>
                    </div>
                     <ChevronDown className="ml-auto size-4 shrink-0 group-data-[collapsible=icon]:hidden" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--sidebar-width)] p-1" align="start">
                 <div className="flex flex-col gap-1">
                     <Button
                        key="all-branches"
                        variant={activeBranch?.id === allBranchesOption.id ? 'default' : 'ghost'}
                        className="w-full justify-start"
                        onClick={() => {
                            setActiveBranch(allBranchesOption);
                            setPopoverOpen(false);
                        }}
                    >
                        {allBranchesOption.name}
                    </Button>
                    {branches.map(branch => (
                        <Button
                            key={branch.id}
                            variant={activeBranch?.id === branch.id ? 'default' : 'ghost'}
                            className="w-full justify-start"
                            onClick={() => {
                                setActiveBranch(branch);
                                setPopoverOpen(false);
                            }}
                        >
                            {branch.name}
                        </Button>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    )
}

const AppSidebar = () => {
    const pathname = usePathname();
    const { isMobile } = useSidebar();
    const { user, logout } = useAuth();
    
    return (
        <Sidebar
            collapsible={isMobile ? 'offcanvas' : 'icon'}
            variant="sidebar"
        >
            <SidebarHeader>
                <Button
                    variant="ghost"
                    className="h-10 w-full justify-start px-2 group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:justify-center"
                    asChild
                >
                    <Link href="/dashboard">
                        <Logo className="size-6 shrink-0 text-primary" />
                        <span className="font-headline text-lg font-semibold group-data-[collapsible=icon]:hidden">
                            ALUR DISTRIBUSI
                        </span>
                    </Link>
                </Button>
                <BranchSelector />
            </SidebarHeader>
            <SidebarContent>
                <SidebarMenu>
                    {navItems.map((item) => (
                        <SidebarMenuItem key={item.href}>
                            <SidebarMenuButton
                                asChild
                                isActive={pathname.startsWith(item.href)}
                                tooltip={{ children: item.label }}
                            >
                                <Link href={item.href}>
                                    <item.icon />
                                    <span>{item.label}</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>
            </SidebarContent>
            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton onClick={logout} tooltip={{ children: "Logout" }}>
                            <LogOut />
                            <span>Logout ({user?.username})</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    );
};

const ProtectedLayout = ({ children }: { children: React.ReactNode }) => {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);
    
    if (loading || !user) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <div className="text-center">
                    <p>Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <BranchProvider>
            <SidebarProvider>
                 <AppSidebar />
                <SidebarInset>
                    <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:h-16 sm:px-6 md:hidden">
                        <SidebarTrigger />
                        <h1 className="font-headline text-lg font-semibold">ALUR DISTRIBUSI</h1>
                    </header>
                    {children}
                </SidebarInset>
            </SidebarProvider>
        </BranchProvider>
    );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
      <AuthProvider>
          <ProtectedLayout>
              {children}
          </ProtectedLayout>
      </AuthProvider>
  );
}
