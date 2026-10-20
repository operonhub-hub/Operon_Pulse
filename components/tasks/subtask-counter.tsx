import { CheckSquare } from "lucide-react";
import type { TaskSubtask } from "@/types";
import { getSubtaskCounts } from "@/lib/subtasks/logic";

/** "3/5" subtask counter with a check icon; renders nothing when there are no subtasks. */
export function SubtaskCounter({
  subtasks,
  className = "",
}: {
  subtasks?: Pick<TaskSubtask, "is_done">[] | null;
  className?: string;
}) {
  const { done, total } = getSubtaskCounts(subtasks);
  if (total === 0) return null;
  const complete = done === total;

  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-medium tabular-nums ${
        complete ? "text-emerald-600" : "text-zinc-500"
      } ${className}`}
      aria-label={`${done} of ${total} subtasks done`}
      title={`${done} of ${total} subtasks done`}
    >
      <CheckSquare className="h-3 w-3" aria-hidden="true" />
      {done}/{total}
    </span>
  );
}
