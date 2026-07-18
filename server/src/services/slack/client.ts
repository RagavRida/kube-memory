import { connectorJson, requireConnector } from "../connectors/connectorHttp.js";

interface SlackApiResponse<T> {
  ok: boolean;
  error?: string;
  [key: string]: unknown;
  messages?: T;
  channels?: T;
}

function formatSlackError(error?: string): string {
  switch (error) {
    case "channel_not_found":
      return "Slack channel not found. Ensure the channel ID is correct and the bot has access.";

    case "not_in_channel":
      return "Bot is not a member of the specified Slack channel. Invite the bot to the channel and try again.";

    case "missing_scope":
      return "Bot is missing required permissions to perform this action. Check the Slack app scopes and reauthorize if necessary.";

    case "invalid_auth":
      return "Invalid Slack authentication. Check the bot token and reauthorize if necessary.";

    case "is_archived": 
      return "The specified Slack channel is archived. Unarchive the channel or choose a different channel.";

    default:
      return "An unknown error occurred while interacting with the Slack API.";
  }
}

 async function slackApiGet<T>(
  workspaceId: string,
  method: string,
  params: Record<string, string | number | undefined> = {},
): Promise<T> {

  // Build the query string from the params object

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      search.set(key, String(value));
    }
  }
  // Construct the full URL for the Slack API request
  const url = `https://slack.com/api/${method}${search.size ? `?${search}` : ""}`;

  // Make the request to the Slack API using the connectorJson function
  const data = await connectorJson<SlackApiResponse<unknown>>(
    workspaceId, 
    "slack", 
    url
  );

  if (!data.ok) {
    throw new Error(`Slack API error: ${data.error ?? "unknown"}`);
  }

  return data as T;
}

async function slackApiPost<T>(
  workspaceId: string,
  method: string,
  body: Record<string, unknown>,
): Promise<T> {

  // Retrieve the Slack connector secret for the specified workspace
  const { secret } = await requireConnector(
    workspaceId,
    "slack"
  );

  const response = await fetch(`https://slack.com/api/${method}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(body),
  });

  const data = (await response.json()) as SlackApiResponse<unknown>;

  if (!data.ok) {
    throw new Error(formatSlackError(data.error));
  }

  return data as T;
}

// async function slackApi<T>(
//   workspaceId: string,
//   method: string,
//   params: Record<string, string | number | undefined> = {},
// ): Promise<T> {
//   const search = new URLSearchParams();
//   for (const [key, value] of Object.entries(params)) {
//     if (value !== undefined) search.set(key, String(value));
//   }

//   const url = `https://slack.com/api/${method}${search.size ? `?${search}` : ""}`;
//   const data = await connectorJson<SlackApiResponse<unknown>>(workspaceId, "slack", url);
//   if (!data.ok) {
//     throw new Error(`Slack API error: ${data.error ?? "unknown"}`);
//   }
//   return data as T;
// }

export async function listChannels(options: {
  workspaceId: string;
  types?: string;
  limit?: number;
}): Promise<unknown[]> {
  // Issuing a GET request to the Slack API to retrieve a list of channels for the specified workspace
    const data = await slackApiGet<{ channels: unknown[] }>(
      options.workspaceId,
      "conversations.list",
      {
        types: options.types ?? "public_channel,private_channel",
        limit: options.limit ?? 100,
      }
    )
  // const data = await slackApi<{ channels: unknown[] }>(options.workspaceId, "conversations.list", {
  //   types: options.types ?? "public_channel,private_channel",
  //   limit: options.limit ?? 100,
  // });
  // return (data as { channels: unknown[] }).channels ?? [];
  return data.channels ?? [];
}

export async function getChannelInfo(options: {
  workspaceId: string;
  channel: string;
}): Promise<unknown> {
  const data = await slackApiGet<{ channel: unknown }>(
    options.workspaceId,
    "conversations.info",
    {
      channel: options.channel,
    }
  );
  return data.channel ?? {};
}

export async function getChannelHistory(options: {
  workspaceId: string;
  channel: string;
  limit?: number;
  oldest?: string;
}): Promise<unknown[]> {
  // Issuing a GET request to the Slack API to retrieve the message history for a specific channel in the specified workspace
    const data = await slackApiGet<{ messages: unknown[] }>(
      options.workspaceId,
      "conversations.history",
      {
        channel: options.channel,
        limit: options.limit ?? 50,
        oldest: options.oldest,
      }
    )
  // const data = await slackApi<{ messages: unknown[] }>(options.workspaceId, "conversations.history", {
  //   channel: options.channel,
  //   limit: options.limit ?? 50,
  //   oldest: options.oldest,
  // });
  // return (data as { messages: unknown[] }).messages ?? [];
  return data.messages ?? [];
}

export async function getReplies(options: {
  workspaceId: string;
  channel: string;
  threadTs?: string; // Optional to be removed in the future, as it will be required to fetch replies for a specific thread
  limit?: number;
}): Promise<unknown[]> {

  const data = await slackApiGet<{ messages: unknown[] }>(
    options.workspaceId,
    "conversations.replies",
    {
      channel: options.channel,
      // 
      thread_ts: options.threadTs,
      limit: options.limit ?? 50,
    }
  );
  return data.messages ?? [];
}

export async function listUsers(options: {
  workspaceId: string;
  limit?: number;
}) : Promise<unknown[]> {
  const data = await slackApiGet<{ members: unknown[] }>(
    options.workspaceId,
    "users.list",
  );

  let users = data.members ?? [];

  if (options.limit) {
    users = users.slice(0, options.limit);
  }

  return users;
}


export async function postMessage(options: {
  workspaceId: string;
  channel: string;
  text: string;
  threadTs?: string;
}): Promise<unknown> {
  // const { secret } = await requireConnector(options.workspaceId, "slack");
  // const res = await fetch("https://slack.com/api/chat.postMessage", {
  //   method: "POST",
  //   headers: {
  //     Authorization: `Bearer ${secret}`,
  //     "Content-Type": "application/json; charset=utf-8",
  //   },
  //   body: JSON.stringify({ channel: options.channel, text: options.text }),
  // });
  // const data = (await res.json()) as SlackApiResponse<unknown>;
  // if (!data.ok) {
  //   throw new Error(`Slack API error: ${data.error ?? "unknown"}`);
  // }
  // return data;

  const body: Record<string, unknown> = {
    channel: options.channel,
    text: options.text,
  };
  if (options.threadTs) {
    body.thread_ts = options.threadTs;
  }

  return await slackApiPost(options.workspaceId, "chat.postMessage", body);
}


export async function isSlackAvailable(workspaceId: string): Promise<boolean> {
  try {
    await requireConnector(workspaceId, "slack");
    return true;
  } catch {
    return false;
  }
}

export async function resolveDefaultChannel(workspaceId: string): Promise<string | undefined> {
  const { config } = await requireConnector(workspaceId, "slack");
  const channel = String(config.channel ?? "").trim();
  return channel || undefined;
}
