export function createReputationSignal({
  agentId,
  value,
  tag1 = "successRate",
  tag2 = "",
}) {
  return {
    agentId,
    value,
    valueDecimals: 0,
    tag1,
    tag2,
    timestamp: Date.now(),
  };
}

export function createTaskFeedback(agentId, successful) {
  return createReputationSignal({
    agentId,
    value: successful ? 100 : 0,
    tag1: "taskSuccess",
  });
}