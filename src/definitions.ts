export interface EntrigPlugin {
  echo(options: { value: string }): Promise<{ value: string }>;
}
