export const tasks = [
  {
    id: 1,
    name: "Research task",
    status: "success",
  },
  {
    id: 2,
    name: "Data analysis",
    status: "success",
  },
  {
    id: 3,
    name: "API execution",
    status: "success",
  },
];

export function getSuccessfulTaskCount() {
  return tasks.filter((task) => task.status === "success").length;
}

export function getTaskSuccessRate() {
  if (tasks.length === 0) return 0;

  return (getSuccessfulTaskCount() / tasks.length) * 100;
}