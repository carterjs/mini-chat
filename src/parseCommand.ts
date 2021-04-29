/**
 * Takes arguments out of a command string
 * @param command a string of space-delimited arguments
 * @returns a list of the arguments
 */
export function parseCommand(command: string) {
  // Break the command string into c-style args list
  const args = (command.match(/(["'””’][^"””]*["'””’])|[^"””\s]+/g) || []).map((arg) => {
    // Remove quote characters
    if (/^["'””’].*["'””’]$/.test(arg)) {
      return arg.slice(1, -1);
    }
    return arg;
  });

  return args;
}
