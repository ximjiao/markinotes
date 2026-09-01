"use client";

import { useCommandPalette } from "../_hooks/use-command-palette";
import { CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";

export function CommandPaletteDialog() {
  const { isOpen, setIsOpen } = useCommandPalette();

  return (
    <CommandDialog open={isOpen} onOpenChange={setIsOpen}>
      <CommandInput placeholder="Type a command or search notes..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => setIsOpen(false)}>Create New Note</CommandItem>
          <CommandItem onSelect={() => setIsOpen(false)}>Open Workspace Folder</CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
