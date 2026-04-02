import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface BranchProps {
  openBranch: boolean;
  setOpenBranch: (open: boolean) => void;
  branches: Array<{ branchid: number; code?: string; name: string }>;
  fieldState: { error?: { message?: string } };
  field: { value: string };
  handleBranchChange: (branchid: string) => void;
  getSelectedBranchText: () => string;
}

export default function Branch({
  openBranch,
  setOpenBranch,
  branches,
  fieldState,
  field,
  handleBranchChange,
  getSelectedBranchText,
}: BranchProps) {
  return (
    <Popover open={openBranch} onOpenChange={setOpenBranch}>
        <PopoverTrigger asChild>
            <Button
            variant="outline"
            role="combobox"
            aria-expanded={openBranch}
            className={cn(
                "w-full justify-between",
                fieldState.error && "border-red-500"
            )}
            >
            {getSelectedBranchText()}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
            <Command>
            <CommandInput placeholder="ค้นหาสาขา..." />
            <CommandList>
                <CommandEmpty>ไม่พบข้อมูลสาขา</CommandEmpty>
                <CommandGroup>
                {branches.map((branch) => (
                    <CommandItem
                    key={branch.branchid}
                    value={`${branch.code || branch.branchid} ${branch.name}`}
                    onSelect={() =>
                        handleBranchChange(
                        branch.branchid.toString()
                        )
                    }
                    >
                    <Check
                        className={cn(
                        "mr-2 h-4 w-4",
                        field.value ===
                            branch.branchid.toString()
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                    />
                    {branch.name}
                    </CommandItem>
                ))}
                </CommandGroup>
            </CommandList>
            </Command>
        </PopoverContent>
    </Popover>
  )
}