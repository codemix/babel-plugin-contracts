export default function items (a, b) {
  let c = [];
  if (a) {
    c.push(a);
  }
  if (b) {
    c.push(b);
  }
  return c;

  post: {
    Array.isArray(retVal);
    retVal.length > 0;
  }
}