/**
 * Takes arguments out of a command string
 * @param command a string of space-delimited arguments
 * @returns a list of the arguments
 */
export function parseCommand(input: string) {
  return input.split(/\s(.+)/);
}
