import { serve, serveStatic, json } from "https://deno.land/x/sift@0.4.2/mod.ts";
import { join } from "https://deno.land/std@0.106.0/path/mod.ts";
import {
  contentType as getContentType,
  lookup,
} from "https://deno.land/x/media_types@v2.10.2/mod.ts";

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

const files = [
  "index.html",
  "assets/index.css",
  "assets/index.js",
  "assets/vendor.js",
  "bg.png",
  "deno.json",
  "deno.png",
];
const BASE_PATH = "/";
const PUBLIC_PATH = "./public";

async function createResponse(fileName: string) {
  const file = await Deno.readFile(fileName);
  const contentType = lookup(fileName) || "text/plain";
  const response = new Response(file);
  response.headers.set("content-type", contentType);
  return response;
}

async function handleRequest(request: Request) {
  const { pathname } = new URL(request.url);
  for (const file of files) {
    if (pathname.startsWith(BASE_PATH + file)) {
      return await createResponse(join(PUBLIC_PATH, file));
    }
  }
  return createResponse(join(PUBLIC_PATH, files[0]));
}

serve({
  "/": async (request: Request) => {
    return await handleRequest(request);
  },
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
    try {
      return await handleRequest(request);
    } catch (e) {
      console.error(e);
    }

    return new Response("Not Found", {
      status: 404,
    });
  },
  404: () => new Response("not found"),
});
