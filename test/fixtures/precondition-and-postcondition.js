export default function demo (input) {
  pre: {
    typeof input === 'string';
  }
  post: {
    typeof it === 'number';
    it > 2;
  }
  return input.length;
}