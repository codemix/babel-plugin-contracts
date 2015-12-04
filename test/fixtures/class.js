class Thing {
  constructor (input) {
    this.input = input;
  }

  set (input) {
    pre: {
      typeof this.input === 'string';
    }
    post: {
      this.input !== old(this.input);
    }

    this.input = input;
  }
}

export default function demo (first, second) {
  const thing = new Thing(first);
  thing.set(second);
  return thing;
}