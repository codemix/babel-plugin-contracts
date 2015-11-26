export default function demo (input) {
  pre: {
    typeof input === 'string';
    input.length > 3;
    input.length < 6;
  }
  return input.length;
}