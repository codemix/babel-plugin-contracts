export default function withdraw (fromAccount, amount) {
  pre: {
    typeof amount === 'number', "Second argument must be a number";
    amount > 0, "Cannot withdraw a zero or negative amount";
    fromAccount.balance - amount > -fromAccount.overdraftLimit, "Must not exceed overdraft limit";
  }
  post: {
    fromAccount.balance - amount > -fromAccount.overdraftLimit, "Must not exceed overdraft limit";
  }

  fromAccount.balance -= amount;
}