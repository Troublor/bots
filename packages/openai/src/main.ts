import { ArgumentParser } from 'argparse';
import { Path } from '@troubots/utils';
import { calculateUsage } from './index.js';

async function main() {
  const parser = new ArgumentParser({
    description: 'OpenAI Scripts',
  });
  const subparsers = parser.add_subparsers({
    title: 'subcommands',
    dest: 'subcommand',
  });
  const cost_parser = subparsers.add_parser('cost', {
    add_help: true,
    description: 'Calculate the cost of each user in an organization.',
  });
  cost_parser.add_argument('--user-map', {
    required: false,
    help: 'The path to the user map JSON file, which defines the mapping from user IDs to names.',
  });
  cost_parser.add_argument('--output', {
    required: false,
    help: 'The path to the output Json file.',
  });
  cost_parser.add_argument('usage file', {
    help: 'The path to the usage CSV file, which can be exported from https://platform.openai.com/usage.',
  });

  const args = parser.parse_args();

  if (args.subcommand === 'cost') {
    const usageFilePath = new Path(args['usage file']);
    const userMapPath = args['user-map']
      ? new Path(args['user-map'])
      : undefined;
    const usages = await calculateUsage(usageFilePath, userMapPath);
    if (args.output) {
      const outputPath = new Path(args.output);
      await outputPath.writeJson(usages);
    } else {
      console.log(JSON.stringify(usages, null, 2));
    }
  } else {
    throw new Error(`Unknown subcommand: ${args.subcommand_name}`);
  }
}

export {};
try {
  await main();
} catch (e) {
  console.error(e);
  process.exit(1);
}
