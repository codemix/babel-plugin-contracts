export default function demo (input) {
  pre: {
    typeof input === 'string';
  }
  post: {
    typeof retVal === 'number';
    retVal > 2;
  }
  return input.length;
}