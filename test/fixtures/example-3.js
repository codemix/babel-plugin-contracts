export default function withdraw (fromAccount, amount) {
  pre: {
    typeof amount === 'number';
    amount > 0;
    fromAccount.balance - amount > -fromAccount.overdraftLimit;
  }
  post: {
    fromAccount.balance - amount > -fromAccount.overdraftLimit;
  }

  fromAccount.balance -= amount;
}