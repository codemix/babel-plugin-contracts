export default function demo (input) {
  invariant: {
    typeof input === 'string';
  }
  return input.length;
}