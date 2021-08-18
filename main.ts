import { serve, serveStatic } from "https://deno.land/x/sift@0.3.5/mod.ts";
export interface Message {
  id: string;
  ts: string;
  user: string;
  body: string;
}
import { generate as generateUUID } from "https://deno.land/std@0.98.0/uuid/v4.ts";

serve({
  "/": serveStatic("index.html", { baseUrl: import.meta.url }),
  "/style.css": serveStatic("style.css", { baseUrl: import.meta.url }),
  "/index.js": serveStatic("index.js", { baseUrl: import.meta.url }),
  "/api/send": async (req) => {
    const msg = await req.json();

    const user = msg["user"];
    if (typeof user !== "string") {
      return new Response("invalid user", { status: 400 });
    }

    const body = msg["body"];
    if (typeof body !== "string") {
      return new Response("invalid body", { status: 400 });
    }

    const channel = new BroadcastChannel("chat");

    const message: Message = {
      id: generateUUID(),
      ts: new Date().toISOString(),
      user,
      body,
    };

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

// async function handleRequest(request: Request) {
//   const { pathname } = new URL(request.url);

//   if (pathname.startsWith("/style.css")) {
//     const style = new URL("style.css", import.meta.url);
//     return fetch(style);
//   }
//   const html = new URL("index.html", import.meta.url);
//   return fetch(html);
// }

// addEventListener("fetch", (event: FetchEvent) => {
//   event.respondWith(handleRequest(event.request));
// });
