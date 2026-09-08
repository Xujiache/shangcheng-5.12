export interface QueryParameter {
  name: string;
  value?: string | number | boolean;
}

export function withQuery(path: string, parameters: QueryParameter[]): string {
  const parts: string[] = [];
  parameters.forEach((parameter: QueryParameter) => {
    if (parameter.value === undefined || `${parameter.value}`.length === 0) return;
    parts.push(`${encodeURIComponent(parameter.name)}=${encodeURIComponent(`${parameter.value}`)}`);
  });
  return parts.length > 0 ? `${path}?${parts.join('&')}` : path;
}
