import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { requireAuthContext } from "../../context/requestContext.js";
import {
  slackGetHistoryInputSchema,
  slackListChannelsInputSchema,
  slackPostMessageInputSchema,
  slackGetChannelInfoInputSchema,
  slackGetRepliesInputSchema,
  slackListUsersInputSchema
} from "../../schemas/mcp/toolInputs.js";
import {
  getChannelHistory,
  isSlackAvailable,
  listChannels,
  postMessage,
  resolveDefaultChannel,
  getChannelInfo,
  getReplies,
  listUsers
} from "../../services/slack/client.js";
import { connectorError, textContent } from "../toolResult.js";
import { integrationToolDescription, READ_ONLY_ANNOTATIONS } from "../constants.js";

export function registerSlackTools(server: McpServer): void {
  server.registerTool(
    "slack_get_history",
    {
      title: "Slack Channel History",
      description: integrationToolDescription(
        "Slack",
        "Fetch recent messages from a Slack channel",
        "Uses the configured default channel when channel is not provided"
      ),
      annotations: READ_ONLY_ANNOTATIONS,
      inputSchema: {
        channel: z.string().optional(),
        limit: z.number().int().min(1).max(200).optional(),
        oldest: z.string().optional(),
      },
    },
    async (args: Record<string, unknown>) => {
      const auth = requireAuthContext();
      const workspaceId = auth.workspace._id.toString();
      if (!(await isSlackAvailable(workspaceId))) {
        return textContent({ 
          error: "Slack connector not configured or not enabled. Connect Slack in the kube-memory dashboard." 
        });
      }
      try {
        const input = slackGetHistoryInputSchema.parse(args);
        const channel = input.channel ?? (await resolveDefaultChannel(workspaceId));
        if (!channel) {
          return textContent({ 
            error: "Channel is required. Either provide a channel ID or configure a default Slack channel in the workspace connector." 
          });
        }
        const messages = await getChannelHistory({ workspaceId, channel, limit: input.limit, oldest: input.oldest });
        return textContent({ channel, messages });
      } catch (err) {
        return connectorError("slack", err);
      }
    },
  );

  server.registerTool(
    "slack_list_channels",
    {
      title: "Slack List Channels",
      description: integrationToolDescription(
        "Slack",
        "List channels available to the configured Slack bot ",
        "Returns public and private channels the bot can access."
      ),
      annotations: READ_ONLY_ANNOTATIONS,
      inputSchema: {
        limit: z.number().int().min(1).max(200).optional(),
      },
    },
    async (args: Record<string, unknown>) => {
      const auth = requireAuthContext();
      const workspaceId = auth.workspace._id.toString();
      if (!(await isSlackAvailable(workspaceId))) {
        return textContent({ 
          error: "Slack connector not configured or not enabled. Connect Slack in the kube-memory dashboard." 
        });
      }
      try {
        const input = slackListChannelsInputSchema.parse(args);
        const channels = await listChannels({ workspaceId, limit: input.limit });
        return textContent({ channels });
      } catch (err) {
        return connectorError("slack", err);
      }
    },
  );

  server.registerTool(
    "slack_get_channel_info",
    {
      title: "Slack Get Channel Info",
      description: integrationToolDescription(
        "Slack",
        "Get information about a Slack channel",
        "Returns metadata including topic, purpose, member count and archive status."
      ),
      annotations: READ_ONLY_ANNOTATIONS,
      inputSchema: {
        channel: z.string(),
      }
    },

    async (args: Record<string, unknown>) => {
      const auth = requireAuthContext();
      const workspaceId = auth.workspace._id.toString();

      if (!(await isSlackAvailable(workspaceId))) {
        return textContent({
          error:
            "Slack connector not configured or not enabled. Connect Slack in the kube-memory dashboard.",
        });
      }

      try {
        const input = slackGetChannelInfoInputSchema.parse(args);

        const channel = await getChannelInfo({
          workspaceId,
          channel: input.channel,
        });

        return textContent({
          channel,
        });
      } catch (err) {
        return connectorError("slack", err);
      }
    }
  )

  server.registerTool(
    "slack_get_replies",
    {
      title: "Slack Get Thread Replies",
      description: integrationToolDescription(
        "Slack",
        "Get replies for a specific thread in a Slack channel",
        "Returns messages that are replies to a specific thread in a Slack channel."
      ),
      inputSchema: {
        channel: z.string(),
        threadTs: z.string().optional(),
        limit: z.number().int().min(1).max(200).optional(),
      }
    },
    async (args: Record<string, unknown>) => {
      const auth = requireAuthContext();
      const workspaceId = auth.workspace._id.toString();

      if (!(await isSlackAvailable(workspaceId))) {
        return textContent({
          error:
            "Slack connector not configured or not enabled. Connect Slack in the kube-memory dashboard.",
        });
      }

      try {
        const input = slackGetRepliesInputSchema.parse(args);

        const replies = await getReplies({
          workspaceId,
          channel: input.channel,
          threadTs: input.threadTs,
          limit: input.limit,
        });

        return textContent({
          replies,
        });
      } catch (err) {
        return connectorError("slack", err);
      }
    }
  )

  server.registerTool(
    "slack_list_users",
    {
      title: "Slack List Users",
      description: integrationToolDescription(
        "Slack",
        "List users in the Slack workspace",
        "Returns workspace members visible to the configured Slack bot."
      ),
      annotations: READ_ONLY_ANNOTATIONS,
      inputSchema: {
        limit: z.number().int().min(1).max(200).optional(),
      },
    },

    async (args: Record<string, unknown>) => {
      const auth = requireAuthContext();
      const workspaceId = auth.workspace._id.toString();

      if (!(await isSlackAvailable(workspaceId))) {
        return textContent({
          error:
            "Slack connector not configured or not enabled. Connect Slack in the kube-memory dashboard.",
        })
      }

      try {
        const input = slackListUsersInputSchema.parse(args);

        const users = await listUsers({
          workspaceId,
          limit: input.limit,
        });

        return textContent({
          users,
        });
      } catch (err) {
        return connectorError("slack", err);
      }
    }
  )

  server.registerTool(
    "slack_post_message",
    {
      title: "Slack Post Message",
      description: integrationToolDescription(
        "Slack",
        "Post a message to a Slack channel",
        "Uses the configured default channel when channel is not provided."
      ),
      inputSchema: {
        channel: z.string().optional(),
        text: z.string(),
        threadTs: z.string().optional(),
      },
    },
    async (args: Record<string, unknown>) => {
      const auth = requireAuthContext();
      if (auth.role !== "admin") {
        return textContent({ error: "Admin role required to post Slack messages" });
      }
      const workspaceId = auth.workspace._id.toString();
      if (!(await isSlackAvailable(workspaceId))) {
        return textContent({ 
          error: "Slack connector not configured or not enabled. Connect Slack in the kube-memory dashboard." 
        });
      }
      try {
        const input = slackPostMessageInputSchema.parse(args);
        const channel = input.channel ?? (await resolveDefaultChannel(workspaceId));
        if (!channel) {
          return textContent({ 
            error: "Channel is required. Either provide a channel ID or configure a default Slack channel in the workspace connector." 
          });
        }
        const result = await postMessage({
          workspaceId,
          channel,
          text: input.text,
          threadTs: input.threadTs,
        });
        return textContent({ channel, result });
      } catch (err) {
        return connectorError("slack", err);
      }
    },
  );
}
