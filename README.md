# Vesper Rewarder

This repository contains the Vesper rewarder contract for Sushi 2x rewards.

## Overview

The `VesperRewarder` contract implements double incentive mechanism for SushiSwap farm feature.
Whenever a user interacts with the `MasterChefV2` contract (that handle 2x rewards farming pools), the `VesperRewarder.onSushiReward()` function is called, and, that function calculates the VSP reward amount based on how much SLP token he staked and send it to the user.

See more: https://dev.sushi.com/sushiswap/contracts/masterchefv2/adding-double-incentives

## Environment

```sh
nvm use
```

## Install

```sh
npm i
```

## Test

```sh
export NODE_URL=<eth mainnet url to fork from>
export BLOCK_NUMBER=<eth mainnet block number> # Last block forked was 13597000
```

or by creating a `.env` file (use `.env.example` as reference)

```sh
npm t
```

## Deploy

1.  Env setup

```sh
export NODE_URL=<eth mainnet url>
export MNEMONIC=<deployer mnemonic phrase>
export DEPLOYER=<deployer address> # If empty, the script will use the accounts[0]
```

or by creating a `.env` file (use `.env.example` as reference)

2.  Deployer account setup

Check the `hardhat.config.ts` file and uncomment the `accounts` param accordingly

3.  Run deployment script

```sh
npm run deploy -- --gasprice <gas price in wei> --network <network>
```

## Verify

After the deployment, use the `hardhat-etherscan` plugin to verify the deployed contracts

```sh
npm run verify -- --network <network>
```
