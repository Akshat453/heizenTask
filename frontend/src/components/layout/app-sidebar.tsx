"use client";

import { Leaf } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { isNavItemActive, visibleNavGroups } from "./navigation";

export function AppSidebar() {
  const pathname = usePathname();
  const { can } = useAuth();
  const { isMobile, setOpenMobile } = useSidebar();
  const groups = visibleNavGroups(can);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu className="group-data-[collapsible=icon]:items-center">
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" tooltip="Fernleaf Kitchen" render={<Link href="/dashboard" />}>
              <span className="grid size-8 shrink-0 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
                <Leaf className="size-4" />
              </span>
              <span className="flex flex-col leading-tight">
                <span className="font-semibold text-sidebar-accent-foreground">Fernleaf</span>
                <span className="text-xs text-sidebar-foreground/70">Kitchen operations</span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="label-caps text-sidebar-foreground/60">{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="group-data-[collapsible=icon]:items-center">
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={isNavItemActive(item, pathname)}
                      tooltip={item.label}
                      className="data-active:[&_svg]:text-sidebar-primary"
                      render={<Link href={item.href} onClick={() => isMobile && setOpenMobile(false)} />}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
