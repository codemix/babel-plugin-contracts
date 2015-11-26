export default function demo (input) {
  pre: {
    typeof input === 'string', "Input must be a string";
  }
  return input.length;
}