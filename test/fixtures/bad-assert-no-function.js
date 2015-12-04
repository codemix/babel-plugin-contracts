assert: fail();

export default function demo (input) {
  assert: input.length > 0;
}

function fail () {
  return false;
}