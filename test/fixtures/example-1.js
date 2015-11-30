export default function warn (message) {
  pre: typeof message === 'string';
  return 'Warning!\n' + message;
}