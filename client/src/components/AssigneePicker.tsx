import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type Assignee = { id: number; name: string | null; email: string | null };

export default function AssigneePicker({
  students,
  selected,
  onToggle,
}: {
  students: Assignee[];
  selected: number[];
  onToggle: (id: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const label = selected.length === 0 ? "Hamıya" : `${selected.length} tələbə seçildi`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className="field flex items-center justify-between text-left">
          <span className={selected.length ? "text-slate-900" : "text-slate-400"}>{label}</span>
          <ChevronsUpDown size={16} className="text-slate-400" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder="Tələbə axtar..." />
          <CommandList>
            <CommandEmpty>Tələbə tapılmadı</CommandEmpty>
            <CommandGroup>
              {students.map((s) => {
                const active = selected.includes(s.id);
                return (
                  <CommandItem key={s.id} value={`${s.name ?? ""} ${s.email ?? ""}`} onSelect={() => onToggle(s.id)}>
                    <span className={`mr-2 grid size-4 place-items-center rounded border ${active ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300"}`}>
                      {active && <Check size={12} />}
                    </span>
                    <span className="truncate">{s.name || s.email}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
