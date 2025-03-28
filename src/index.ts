import { Hono } from "hono";

import {
  createAckEvent,
  createDoneEvent,
  createErrorsEvent,
  createTextEvent,
  getUserMessage,
  verifyAndParseRequest,
  prompt,
} from "@copilot-extensions/preview-sdk";
import { serve } from "@hono/node-server";

const app = new Hono();

app.get("/", (c) => {
  return c.text("Welcome to my Copilot Exstension!");
});

//Create a root route that receives a form post, /. This is the end point
//that Copilot will interact with.

app.post("/", async (c) => {
  // When the message comes in, you need to verify the request and parse the payload:

  // Identify the user, using the GitHub API token provided in the request headers
  const tokenForUser = c.req.header("X-Github-Token") ?? "";

  const body = await c.req.text();
  const signature = c.req.header("github-public-key-signature") ?? "";
  const keyID = c.req.header("github-public-key-identifier") ?? "";

  const { isValidRequest, payload } = await verifyAndParseRequest(
    body,
    signature,
    keyID,
    {
      token: tokenForUser,
    }
  );

  if (!isValidRequest) {
    console.error("Request verification failed");
    c.header("Content-Type", "text/plain");
    c.status(401);
    c.text("Request could not be verified");
    return;
  }

  // After veryfying the request, process the message and create a response.
  //Here is the simple example that greets the user.

  const userPrompt = getUserMessage(payload);

  try {
    const { message } = await prompt(userPrompt, {
      token: tokenForUser,
    });

    return c.text(
      createAckEvent() + createTextEvent(message.content) + createDoneEvent()
    );
  } catch (error) {
    createErrorsEvent([
      {
        type: "agent",
        message: (error as Error).message,
        code: "prompt error",
        identifier: "prompt error",
      },
    ]);
  }
});

const port = 3000;
console.log(`Server running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});
