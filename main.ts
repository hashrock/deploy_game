import {
  serve,
  serveStatic,
  json
} from "https://deno.land/x/sift@0.3.5/mod.ts";

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
  "/": serveStatic("index.html", { baseUrl: import.meta.url }),
  "/style.css": serveStatic("style.css", { baseUrl: import.meta.url }),
  "/index.js": serveStatic("index.js", { baseUrl: import.meta.url }),
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
  404: () => new Response("not found"),
});
