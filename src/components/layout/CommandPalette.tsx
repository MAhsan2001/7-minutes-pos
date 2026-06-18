"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { useUIStore } from "@/lib/stores/ui-store";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Warehouse,
  Truck,
  History,
  Settings,
  Search,
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";

export function CommandPalette() {
  const router = useRouter();
  const { commandPaletteOpen, setCommandPaletteOpen } = useUIStore();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  const runCommand = (command: () => void) => {
    setCommandPaletteOpen(false);
    command();
  };

  if (!commandPaletteOpen) return null;

  return (
    <Dialog.Root open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] animate-in fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-xl z-[100] animate-in fade-in zoom-in-95">
          <Dialog.Title className="sr-only">Command Palette</Dialog.Title>
          <Dialog.Description className="sr-only">Search for pages and commands</Dialog.Description>
          <Command 
            className="flex flex-col h-full max-h-[80vh] w-full overflow-hidden rounded-2xl bg-card border border-border shadow-2xl"
            shouldFilter={true}
          >
            <div className="flex items-center border-b border-border px-3">
              <Search className="mr-2 h-5 w-5 shrink-0 opacity-50" />
              <Command.Input 
                autoFocus
                className="flex h-14 w-full rounded-md bg-transparent py-3 text-base outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 text-foreground"
                placeholder="Search pages or commands..." 
              />
            </div>
            <Command.List className="max-h-[300px] overflow-y-auto overflow-x-hidden p-2 text-foreground">
              <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
                No results found.
              </Command.Empty>
              
              <Command.Group heading="Navigation" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted-foreground">
                <Command.Item 
                  onSelect={() => runCommand(() => router.push("/"))}
                  className="relative flex cursor-pointer select-none items-center rounded-lg px-2 py-2.5 text-sm outline-none aria-selected:bg-muted aria-selected:text-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 hover:bg-muted hover:text-foreground"
                >
                  <LayoutDashboard className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>Dashboard</span>
                </Command.Item>
                <Command.Item 
                  onSelect={() => runCommand(() => router.push("/pos"))}
                  className="relative flex cursor-pointer select-none items-center rounded-lg px-2 py-2.5 text-sm outline-none aria-selected:bg-muted aria-selected:text-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 hover:bg-muted hover:text-foreground"
                >
                  <ShoppingCart className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>POS Terminal</span>
                </Command.Item>
                <Command.Item 
                  onSelect={() => runCommand(() => router.push("/products"))}
                  className="relative flex cursor-pointer select-none items-center rounded-lg px-2 py-2.5 text-sm outline-none aria-selected:bg-muted aria-selected:text-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 hover:bg-muted hover:text-foreground"
                >
                  <Package className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>Products</span>
                </Command.Item>
                <Command.Item 
                  onSelect={() => runCommand(() => router.push("/stock"))}
                  className="relative flex cursor-pointer select-none items-center rounded-lg px-2 py-2.5 text-sm outline-none aria-selected:bg-muted aria-selected:text-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 hover:bg-muted hover:text-foreground"
                >
                  <Warehouse className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>Stock Management</span>
                </Command.Item>
                <Command.Item 
                  onSelect={() => runCommand(() => router.push("/suppliers"))}
                  className="relative flex cursor-pointer select-none items-center rounded-lg px-2 py-2.5 text-sm outline-none aria-selected:bg-muted aria-selected:text-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 hover:bg-muted hover:text-foreground"
                >
                  <Truck className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>Suppliers & Purchases</span>
                </Command.Item>
                <Command.Item 
                  onSelect={() => runCommand(() => router.push("/sales"))}
                  className="relative flex cursor-pointer select-none items-center rounded-lg px-2 py-2.5 text-sm outline-none aria-selected:bg-muted aria-selected:text-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 hover:bg-muted hover:text-foreground"
                >
                  <History className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>Sales History</span>
                </Command.Item>
                <Command.Item 
                  onSelect={() => runCommand(() => router.push("/settings"))}
                  className="relative flex cursor-pointer select-none items-center rounded-lg px-2 py-2.5 text-sm outline-none aria-selected:bg-muted aria-selected:text-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 hover:bg-muted hover:text-foreground"
                >
                  <Settings className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>Settings</span>
                </Command.Item>
              </Command.Group>
            </Command.List>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
