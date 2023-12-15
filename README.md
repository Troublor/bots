# bots

The collection of bots and convenient scripts for my personal use.

## Structure

The repo is a monorepo where each bot/script is located as a yarn workspace in the `packages` folder.

Each package is meant to be a standalone bot/script with its own dependencies and configuration.

## Notes

Sync shared dependencies across different workspaces using `syncpack` with `.syncpackrc.cjs`:

```shell
yarn syncpack fix-mismatches
```

## Components

### `@bots/openai`

Scripts to help calculate the usage of each user in the orangization.
