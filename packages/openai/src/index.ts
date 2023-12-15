import { Path } from '@troubots/utils';

/**
 * Map from OpenAI user id to name.
 */
export interface UserMap {
  [key: string]: string;
}

export interface UsageRaw {
  organization_id: string;
  n_requests: number;
  operation: string;
  n_context_tokens_total: number;
  n_generated_tokens_total: number;
  usage_type: string;
  model: string;
  timestamp: Date;
  user: string;
}

export interface Usage {
  name: string;
  id: string;
  start: Date;
  end: Date;
  models: { [key: string]: ModelUsage };
  cost: number; // in USD
}

export interface ModelUsage {
  model: string;
  n_requests: number;
  n_input_tokens: number;
  n_output_tokens: number;
  cost: number; // in USD
}

export interface Price {
  [model: string]: {
    [usage_type: string]: {
      input: {
        cost: number; // price for the amount of tokens
        tokens: number; // token amount
      };
      output: {
        cost: number; // price for the amount of tokens
        tokens: number; // token amount
      };
    };
  };
}

const price: Price = {
  'gpt-4-1106-preview': {
    text: {
      input: {
        cost: 0.01,
        tokens: 1000,
      },
      output: {
        cost: 0.03,
        tokens: 1000,
      },
    },
  },
  'gpt-4': {
    text: {
      input: {
        cost: 0.03,
        tokens: 1000,
      },
      output: {
        cost: 0.06,
        tokens: 1000,
      },
    },
  },
  'gpt-4-0613': {
    text: {
      input: {
        cost: 0.03,
        tokens: 1000,
      },
      output: {
        cost: 0.06,
        tokens: 1000,
      },
    },
  },
  'gpt4-32k': {
    text: {
      input: {
        cost: 0.06,
        tokens: 1000,
      },
      output: {
        cost: 0.12,
        tokens: 1000,
      },
    },
  },
  'gpt-3.5-turbo-1106': {
    text: {
      input: {
        cost: 0.001,
        tokens: 1000,
      },
      output: {
        cost: 0.002,
        tokens: 1000,
      },
    },
  },
  'gpt-3.5-turbo-0613': {
    text: {
      input: {
        cost: 0.001,
        tokens: 1000,
      },
      output: {
        cost: 0.002,
        tokens: 1000,
      },
    },
  },
  'gpt-3.5-turbo-16k-0613': {
    text: {
      input: {
        cost: 0.001,
        tokens: 1000,
      },
      output: {
        cost: 0.002,
        tokens: 1000,
      },
    },
  },
  'gpt-3.5-turbo-0301': {
    text: {
      input: {
        cost: 0.001,
        tokens: 1000,
      },
      output: {
        cost: 0.002,
        tokens: 1000,
      },
    },
  },
  'gpt-3.5-turbo-instruct': {
    text: {
      input: {
        cost: 0.0015,
        tokens: 1000,
      },
      output: {
        cost: 0.002,
        tokens: 1000,
      },
    },
  },
};

export async function calculateUsage(
  usageFilePath: Path,
  userMapFile?: Path,
): Promise<Record<string, Usage>> {
  const userMap =
    (userMapFile && (await userMapFile.readJson<UserMap>())) || {};
  const usagesRaw = await usageFilePath.readCsv<UsageRaw>({
    skip_head: true,
    converter: (row) => ({
      organization_id: row[0],
      n_requests: parseInt(row[1]),
      operation: row[2],
      n_context_tokens_total: parseInt(row[3]),
      n_generated_tokens_total: parseInt(row[4]),
      usage_type: row[5],
      model: row[6],
      timestamp: new Date(parseInt(row[7]) * 1000),
      user: row[8],
    }),
  });
  // organization_id,n_requests,operation,n_context_tokens_total,n_generated_tokens_total,usage_type,model,timestamp,user
  const usages: Record<string, Usage> = {};
  for (const usageRaw of usagesRaw) {
    const usage =
      usageRaw.user in usages
        ? usages[usageRaw.user as string]
        : {
            name:
              usageRaw.user in userMap ? userMap[usageRaw.user] : usageRaw.user,
            id: usageRaw.user,
            start: usageRaw.timestamp,
            end: usageRaw.timestamp,
            models: {},
            cost: 0,
          };
    if (usageRaw.timestamp < usage.start) {
      usage.start = usageRaw.timestamp;
    }
    if (usageRaw.timestamp > usage.end) {
      usage.end = usageRaw.timestamp;
    }
    const model =
      usageRaw.model in usage.models
        ? usage.models[usageRaw.model]
        : {
            model: usageRaw.model,
            n_requests: 0,
            n_input_tokens: 0,
            n_output_tokens: 0,
            cost: 0,
          };
    model.n_requests += usageRaw.n_requests;
    model.n_input_tokens += usageRaw.n_context_tokens_total;
    model.n_output_tokens += usageRaw.n_generated_tokens_total;
    if (!(usageRaw.model in price)) {
      throw new Error(`Unknown model: ${usageRaw.model}`);
    }
    const modelPrice = price[usageRaw.model];
    if (!(usageRaw.usage_type in modelPrice)) {
      throw new Error(
        `Unknown usage type: ${usageRaw.usage_type} for model ${usageRaw.model}`,
      );
    }
    const usageTypePrice = modelPrice[usageRaw.usage_type];
    const inputCost =
      (model.n_input_tokens / usageTypePrice.input.tokens) *
      usageTypePrice.input.cost;
    const outputCost =
      (model.n_output_tokens / usageTypePrice.output.tokens) *
      usageTypePrice.output.cost;
    model.cost = inputCost + outputCost;
    usage.models[usageRaw.model] = model;

    let totalCost = 0;
    for (const model of Object.values(usage.models)) {
      totalCost += model.cost;
    }
    usage.cost = totalCost;
    usages[usageRaw.user] = usage;
  }

  return usages;
}
