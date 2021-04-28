/**
 * Takes arguments out of a command string
 * @param command a string of space-delimited arguments
 * @returns a list of the arguments
 */
 export function parseCommand(command) {
    // Check if it's a command
    if (!/^\/\w+/.test(input)) {
      // If not, make it a plain send
      return ["SEND", command];
    }

    // Break the command string into c-style args list
    const args = (command.slice(1).match(/("[^"]*")|[^"\s]+/g) || []).map((arg) => {
      // Remove quote characters
      if (arg.startsWith('"')) {
        return arg.slice(1, -1);
      }
      return arg;
    });
  
    return args;
  }
  