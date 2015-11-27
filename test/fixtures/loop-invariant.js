export default function demo (input) {
  for (let i = 0; i < 10; i++) {
    invariant: {
      typeof i === 'number';
      i >= 0;
    }
  }
  return input.length;
}