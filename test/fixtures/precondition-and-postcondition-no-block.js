export default function demo (input) {
  pre: typeof input === 'string';
  post: typeof it === 'number';
  post: it > 2;
  return input.length;
}