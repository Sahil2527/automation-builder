'use server'

import { db } from '@/lib/db'
import { currentUser } from '@clerk/nextjs'
import { Client } from '@notionhq/client'

export const onNotionConnect = async (
  access_token: string,
  workspace_id: string,
  workspace_icon: string,
  workspace_name: string,
  database_id: string,
  id: string
) => {
  'use server'

  if (!access_token || !workspace_id || !workspace_name || !id) {
    throw new Error("❌ Missing required parameters for Notion connection.");
  }

  console.log("🔗 Connecting to Notion...");
  console.log({ access_token, workspace_id, workspace_name, database_id, id });

  // Check if Notion is already connected
  const notion_connected = await db.notion.findFirst({
    where: { accessToken: access_token },
    include: {
      connections: { select: { type: true } },
    },
  });

  if (!notion_connected) {
    // Create a new Notion connection
    await db.notion.create({
      data: {
        userId: id,
        workspaceIcon: workspace_icon || '',
        accessToken: access_token,
        workspaceId: workspace_id,
        workspaceName: workspace_name,
        databaseId: database_id || '',
        connections: {
          create: {
            userId: id,
            type: 'Notion',
          },
        },
      },
    });
    console.log("✅ Notion connection created successfully.");
  } else {
    console.log("⚠️ Notion is already connected.");
  }
};

export const getNotionConnection = async () => {
  const user = await currentUser();
  if (!user) {
    console.warn("⚠️ No user found for Notion connection.");
    return null;
  }

  const connection = await db.notion.findFirst({ where: { userId: user.id } });
  console.log("🔍 Found Notion connection:", connection);
  return connection;
};

export const getNotionDatabase = async (databaseId: string, accessToken: string) => {
  if (!databaseId || !accessToken) {
    throw new Error("❌ Missing database ID or access token.");
  }

  console.log("📂 Fetching Notion database...");
  const notion = new Client({ auth: accessToken });

  try {
    const response = await notion.databases.retrieve({ database_id: databaseId });
    console.log("✅ Notion database retrieved:", response);
    return response;
  } catch (error) {
    console.error("❌ Error retrieving Notion database:", error);
    throw new Error("Failed to retrieve Notion database.");
  }
};

export const onCreateNewPageInDatabase = async (
  databaseId: string,
  accessToken: string,
  content: string
) => {
  console.log("📝 Creating new Notion page...");
  console.log({ databaseId, accessToken: accessToken ? "Provided" : "Missing", content });

  if (!databaseId || !accessToken || !content) {
    throw new Error("❌ Missing required parameters for creating a Notion page.");
  }

  const notion = new Client({ auth: accessToken });

  try {
    const response = await notion.pages.create({
      parent: { database_id: databaseId },
      properties: {
        Name: {
          title: [{ text: { content } }],
        },
      },
    });

    console.log("✅ Notion page created successfully:", response);
    return response;
  } catch (error) {
    console.error("❌ Error creating Notion page:", error);
    throw new Error("Failed to create a new page in the Notion database.");
  }
};
