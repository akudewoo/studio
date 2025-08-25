
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
  FileText,
} from 'lucide-react';
import { Logo } from '@/components/icons/logo';

const navItems = [
  { href: '/produk', label: 'Daftar Produk', icon: Package },
  { href: '/kios', label: 'Data Kios', icon: Store },
  { href: '/penebusan', label: 'Penebusan', icon: ShoppingCart },
  { href: '/pengeluaran-do', label: 'Pengeluaran DO', icon: Truck },
  { href: '/penyaluran-kios', label: 'Penyaluran Kios', icon: Warehouse },
  { href: '/pembayaran', label: 'Pembayaran', icon: CircleDollarSign },
  { href: '/laporan-harian', label: 'Ringkasan Harian', icon: FileText },
];

const AppSidebar = () => {
    const pathname = usePathname();
    const { isMobile } = useSidebar();

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
                            AlurDistribusi
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
        </Sidebar>
    );
};


export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) {
    return (
       <SidebarProvider>
        <Sidebar collapsible="icon" variant="sidebar" className="hidden md:block">
           <SidebarHeader>
              <Button
                  variant="ghost"
                  className="h-10 w-full justify-start px-2 group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:justify-center"
              >
                  <Logo className="size-6 shrink-0 text-primary" />
                  <span className="font-headline text-lg font-semibold group-data-[collapsible=icon]:hidden">
                      AlurDistribusi
                  </span>
              </Button>
          </SidebarHeader>
           <SidebarContent>
              <SidebarMenu>
                 {/* Skeleton */}
                 {Array.from({ length: 7 }).map((_, i) => (
                    <SidebarMenuItem key={i}>
                       <SidebarMenuButton>
                          <div className="size-4 shrink-0" />
                          <span className="w-20" />
                       </SidebarMenuButton>
                    </SidebarMenuItem>
                 ))}
              </SidebarMenu>
           </SidebarContent>
        </Sidebar>
        <SidebarInset>
           <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:h-16 sm:px-6 md:hidden">
              <SidebarTrigger />
              <h1 className="font-headline text-lg font-semibold">AlurDistribusi</h1>
           </header>
           {children}
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
          <h1 className="font-headline text-lg font-semibold">AlurDistribusi</h1>
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
