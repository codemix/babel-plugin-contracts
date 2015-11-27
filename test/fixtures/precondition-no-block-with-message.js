export default function demo (input) {
  pre: typeof input === 'string', "Expected string";
  return input.length;
}