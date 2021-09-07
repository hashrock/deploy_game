import {
  serve,
  serveStatic,
  json,
} from "https://deno.land/x/sift@0.3.5/mod.ts";
import { join } from "https://deno.land/std@0.106.0/path/mod.ts";
import {
  contentType as getContentType,
  lookup,
} from "https://raw.githubusercontent.com/usesift/media_types/34656bf398c81f2687fa5010e56844dac4e7a2e9/mod.ts";

export interface Message {
  id: string;
  ts: string;
  user: User;
  body: string;
  type: string;
}
import { generate as generateUUID } from "https://deno.land/std@0.98.0/uuid/v4.ts";

const users = new Map<string, User>();

interface User {
  id: string;
  name: string;
  ts: number;
}

serve({
  "/": serveStatic("public/index.html", { baseUrl: import.meta.url }),
  "/api/send": async (req) => {
    const msg = await req.json();

    const user: User = msg["user"];

    const body = msg["body"];
    if (typeof body !== "string") {
      return new Response("invalid body", { status: 400 });
    }
    const type = msg["type"];
    if (typeof type !== "string") {
      return new Response("invalid type", { status: 400 });
    }
    const channel = new BroadcastChannel("chat");

    const message: Message = {
      id: generateUUID(),
      ts: new Date().toISOString(),
      user,
      body,
      type,
    };

    user.ts = new Date().getTime();

    channel.postMessage(message);
    channel.close();

    return new Response("message sent");
  },
  "/api/listen": () => {
    const channel = new BroadcastChannel("chat");

    const stream = new ReadableStream({
      start: (controller) => {
        controller.enqueue(": Welcome to Deno Deploy Chat!\n\n");
        channel.onmessage = (e) => {
          const body = `data: ${JSON.stringify(e.data)}\n\n`;
          controller.enqueue(body);
        };
      },
      cancel() {
        channel.close();
      },
    });

    return new Response(stream.pipeThrough(new TextEncoderStream()), {
      headers: { "content-type": "text/event-stream" },
    });
  },
  "/:filename+": async (request, params) => {
    const filename = join("public", ...params.filename);
    try {
      const contentType: string | undefined = getContentType(filename);
      const file = await Deno.readFile(filename);

      if (contentType !== undefined) {
        return new Response(file, {
          headers: {
            "content-type": contentType,
          },
        });
      }
    } catch (e) {
      console.error(e)
    }

    return new Response("Not Found", {
      status: 404,
    });
  },
  404: () => new Response("not found"),
});
