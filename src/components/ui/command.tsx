import * as React from "react";
import { type DialogProps } from "@radix-ui/react-dialog";
import { Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";


interface CommandDialogProps extends DialogProps {}



CommandInput.displayName = CommandPrimitive.Input.displayName;


CommandList.displayName = CommandPrimitive.List.displayName;


CommandEmpty.displayName = CommandPrimitive.Empty.displayName;


CommandGroup.displayName = CommandPrimitive.Group.displayName;

CommandSeparator.displayName = CommandPrimitive.Separator.displayName;


CommandItem.displayName = CommandPrimitive.Item.displayName;

// Removed: This component depended on unavailable cmdk package. Replace with a custom command palette or native HTML as needed.
CommandShortcut.displayName = "CommandShortcut";

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
};
