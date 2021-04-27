/**
 * Join a list of messages
 * @param messages a number of messages
 * @returns all messages in a space-delimited list (quotes to separate multi-word messages)
 */
export function merge(...messages: string[]): string {
  return messages.map((message) => {
    // Quote components with spaces
    if (`${message}`.includes(" ")) {
      return `"${message}"`;
    }

    return message;
  }).join(" ");
}
