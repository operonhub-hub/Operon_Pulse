/**
 * Pure task selectors for supporting-role views. Shared by pages, insights,
 * attention and tests.
 */

type TaskRoleFields = {
  owner_id: string;
  support_person_id?: string | null;
};

/**
 * True when `userId` is the task's support person and not also its owner.
 * (Nothing in the database prevents owner = support, so that case is excluded here.)
 */
export function isSupportingTask(task: TaskRoleFields, userId: string | null | undefined): boolean {
  if (!userId || !task.support_person_id) return false;
  return task.support_person_id === userId && task.owner_id !== userId;
}

export function isOwnedTask(task: TaskRoleFields, userId: string | null | undefined): boolean {
  return !!userId && task.owner_id === userId;
}

/** Tasks the user supports but doesn't own. */
export function selectSupportingTasks<T extends TaskRoleFields>(
  tasks: readonly T[],
  userId: string | null | undefined
): T[] {
  return tasks.filter((t) => isSupportingTask(t, userId));
}

/** "Mine": tasks the user owns plus tasks they support, each listed once. */
export function selectMyTasks<T extends TaskRoleFields>(
  tasks: readonly T[],
  userId: string | null | undefined
): T[] {
  return tasks.filter((t) => isOwnedTask(t, userId) || isSupportingTask(t, userId));
}
