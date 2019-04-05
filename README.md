# dex-contract

Truffle v4.1.15 (core: 4.1.15)
Solidity v0.4.25 (solc-js)

## get started
change python version to 2.X(ex:2.7.9)

```
git clone https://github.com/moldcoin/dex-contract.git
npm install
```

## deploy to private environment

```
truffle develop
mtruffle(develop)> migrate
```

## deploy to ropsten testnet
**before migrate**

change migrations/3_deploy_moldex.js second argument to your address

```
truffle migrate --network ropsten
```

## Trouble shooting
Error: Attempting to run transaction which calls a contract function, but recipient address 0x17647ef21c6fd7e67486c57affBb1faf9eb30ea5 is not a Contract address

```
migrate --reset
```

## Test
```
truffle test
```
