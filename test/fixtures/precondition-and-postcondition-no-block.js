export default function demo (input) {
  pre: typeof input === 'string';
  post: typeof retVal === 'number';
  post: retVal > 2;
  return input.length;
}