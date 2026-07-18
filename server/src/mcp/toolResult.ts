export function textContent(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

export function connectorError(type: string, err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return textContent({ error: message, connector: type });
}
