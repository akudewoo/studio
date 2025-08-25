'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  CircleDollarSign,
  Package,
  ShoppingCart,
  Store,
  Truck,
  Warehouse,
  Settings,
} from 'lucide-react';
import { Logo as DefaultLogo } from '@/components/icons/logo';
import { useSettings } from '@/hooks/use-settings';
import { getIcon } from '@/components/icons/icons';


const navItems = [
  { href: '/produk', label: 'Daftar Produk', icon: Package },
  { href: '/kios', label: 'Data Kios', icon: Store },
  { href: '/penebusan', label: 'Penebusan', icon: ShoppingCart },
  { href: '/pengeluaran-do', label: 'Pengeluaran DO', icon: Truck },
  { href: '/penyaluran-kios', label: 'Penyaluran Kios', icon: Warehouse },
  { href: '/pembayaran', label: 'Pembayaran', icon: CircleDollarSign },
];

const AppSidebar = () => {
    const { settings, isLoaded } = useSettings();
    const pathname = usePathname();
    const { isMobile, open, setOpen } = useSidebar();

    React.useEffect(() => {
        if(isLoaded) {
            setOpen(settings.sidebarOpen);
        }
    }, [isLoaded, settings.sidebarOpen, setOpen]);
    
    const Logo = isLoaded && settings.appIcon ? getIcon(settings.appIcon) : DefaultLogo;

    if (!isLoaded) {
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
                    <Link href="/produk">
                        <DefaultLogo className="size-6 shrink-0 text-primary" />
                        <span className="font-headline text-lg font-semibold group-data-[collapsible=icon]:hidden">
                            AlurDistribusi
                        </span>
                    </Link>
                </Button>
            </SidebarHeader>
            <SidebarContent>
                <SidebarMenu>
                {[...Array(6)].map((_, i) => (
                    <SidebarMenuItem key={i}>
                        <SidebarMenuButton>
                            <div className="size-4 bg-muted rounded-md animate-pulse" />
                            <div className="h-4 w-32 bg-muted rounded-md animate-pulse" />
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                ))}
                </SidebarMenu>
            </SidebarContent>
            <SidebarContent className="!flex-grow-0">
                 <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton>
                           <div className="size-4 bg-muted rounded-md animate-pulse" />
                           <div className="h-4 w-32 bg-muted rounded-md animate-pulse" />
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarContent>
        </Sidebar>
        );
    }

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
                    <Link href="/produk">
                        <Logo className="size-6 shrink-0 text-primary" />
                        <span className="font-headline text-lg font-semibold group-data-[collapsible=icon]:hidden">
                            {settings.appName}
                        </span>
                    </Link>
                </Button>
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
            <SidebarContent className="!flex-grow-0">
                 <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            asChild
                            isActive={pathname.startsWith('/pengaturan')}
                            tooltip={{ children: "Pengaturan" }}
                        >
                            <Link href="/pengaturan">
                                <Settings />
                                <span>Pengaturan</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarContent>
        </Sidebar>
    );
};


export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { settings, isLoaded } = useSettings();

  if (!isLoaded) {
    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                <div className="flex-1 p-4 space-y-4">
                   <div className="h-8 w-48 bg-muted rounded-md animate-pulse" />
                   <div className="h-40 w-full bg-muted rounded-md animate-pulse" />
                   <div className="h-80 w-full bg-muted rounded-md animate-pulse" />
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
  }
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:h-16 sm:px-6 md:hidden">
          <SidebarTrigger />
          <h1 className="font-headline text-lg font-semibold">{settings.appName}</h1>
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
