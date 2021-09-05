import "./style.css";
import * as PIXI from "pixi.js";

import { generateSaurs, generateUUID } from "./util";

class DenoSprite extends PIXI.Container {
  vx: number = 0;
  vy: number = 0;
  tx: number = 0;
  ty: number = 0;
  _text: PIXI.Text = new PIXI.Text("HELLO", {});
  _sprite: PIXI.AnimatedSprite;

  constructor(texture: PIXI.Texture[], x: number, y: number) {
    super();
    this._sprite = new PIXI.AnimatedSprite(texture);
    this.x = x;
    this.y = y;
    this.tx = x;
    this.ty = y;
    this.addChild(this._sprite);
    this._sprite.position.set(0, 0);
    this._sprite.anchor.set(0.5);
    this._sprite.animationSpeed = 0.5;
    this.addChild(this._text);
    this._text.position.set(0, -50);
  }

  set text(v: string) {
    this._text.text = v;
  }

  // set x(v: number) {
  //   this.x = v;
  //   this._text.x = v;
  // }

  // set y(v: number) {
  //   this.x = v;
  //   this._text.x = v;
  // }
}

const app = new PIXI.Application({
  width: window.innerWidth,
  height: window.innerHeight,
  antialias: false,
  resolution: 1,
});

interface Message {
  id: string;
  body: string;
  ts: number;
  user: User;
}

let globalMessages: Message[] = [];
const userMessages: { [key: string]: Message } = {};

document.querySelector("#canvas")?.appendChild(app.view);
PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;

const DENO_SPEED = 5;
const denoTextures0: PIXI.Texture[] = [];
const denoTextures1: PIXI.Texture[] = [];

function setMove(deno: DenoSprite) {
  // if same position, do nothing
  deno.vx = 0;
  deno.vy = 0;

  const dx = deno.tx - deno.x;
  const dy = deno.ty - deno.y;
  const d2 = dx ** 2 + dy ** 2;
  const d = Math.sqrt(d2);
  if (d !== 0) {
    const t = d / DENO_SPEED;

    const vx = dx / t;
    const vy = dy / t;
    deno.vx = Math.round(vx);
    deno.vy = Math.round(vy);
  }

  deno.scale.y = 4;
  if (deno.vx > 0) {
    deno._sprite.scale.x = 4;
  } else {
    deno._sprite.scale.x = -4;
  }
  if (deno.vy > 0) {
    deno._sprite.textures = denoTextures0;
  } else {
    deno._sprite.textures = denoTextures1;
  }

  deno._sprite.play();
}

function updateMove(deno: DenoSprite) {
  deno.x += deno.vx;
  deno.y += deno.vy;
  if (Math.abs(deno.tx - deno.x) <= Math.abs(deno.vx)) {
    deno.vx = 0;
    deno.x = deno.tx;
  }
  if (Math.abs(deno.ty - deno.y) <= Math.abs(deno.vy)) {
    deno.vy = 0;
    deno.y = deno.ty;
  }
  if (deno.vx === 0 && deno.vy === 0) {
    deno._sprite.gotoAndStop(0);
  }
}
interface User {
  id: string;
  name: string;
  position: {
    x: number;
    y: number;
  };
  ts: number;
}

const userSpriteInstances: Record<string, DenoSprite> = {};

function getMyDeno() {
  return userSpriteInstances[user.id];
}

function createDenoInstance(x: number, y: number) {
  const deno = new DenoSprite(denoTextures0, x, y);
  deno._sprite.play();
  return deno;
}

const users: Record<string, User> = {};
let globalMessageText = new PIXI.Text("", {
  fontSize: 16,
});
function setup(user: User) {
  for (let i = 0; i < 4; i++) {
    denoTextures0.push(PIXI.Texture.from(`deno ${i}.aseprite`, {}, false));
  }
  for (let i = 4; i < 8; i++) {
    denoTextures1.push(PIXI.Texture.from(`deno ${i}.aseprite`, {}, false));
  }
  const randomx = Math.floor(Math.random() * app.stage.width);
  const randomy = Math.floor(Math.random() * app.stage.height);

  const deno = createDenoInstance(randomx, randomy);
  userSpriteInstances[user.id] = deno;

  app.stage.addChild(deno);
  app.stage.addChild(deno._text);

  const debugText = new PIXI.Text(`${user.name}`, {
    fontSize: 16,
  });
  debugText.x = 0;
  debugText.y = 100;
  app.stage.addChild(debugText);

  //display global messages
  globalMessageText.x = 600;
  globalMessageText.y = 0;
  app.stage.addChild(globalMessageText);

  app.stage.interactive = true;
  app.stage.on("pointerdown", (e) => {
    const myDeno = getMyDeno();
    myDeno.tx = e.data.global.x;
    myDeno.ty = e.data.global.y;
    setMove(myDeno);
  });
  const update = () => {
    for (const sprite of Object.keys(userSpriteInstances)) {
      const spriteInstance = userSpriteInstances[sprite];
      updateMove(spriteInstance);
    }

    // display all denos position in debug text
    for (const sprite of Object.keys(userSpriteInstances)) {
      const spriteInstance = userSpriteInstances[sprite];
      const item = users[sprite];
      if (item) {
        debugText.text = "";
        if (user.id === sprite) {
          debugText.text += `(me) `;
        }
        debugText.text += `${item.name} x:${spriteInstance.x} y:${spriteInstance.y} tx:${spriteInstance.tx} ty:${spriteInstance.ty} \n`;
      }
    }

    for (const sprite of Object.keys(userSpriteInstances)) {
      const spriteInstance = userSpriteInstances[sprite];
      const item = users[sprite];
      if (item) {
        if (userMessages[sprite]) {
          deno.text =
            userMessages[sprite].user.name + "\n" + userMessages[sprite].body;
        }

        debugText.text = "";
        if (user.id === sprite) {
          debugText.text += `(me) `;
        }
        debugText.text += `${item.name} x:${spriteInstance.x} y:${spriteInstance.y} tx:${spriteInstance.tx} ty:${spriteInstance.ty} \n`;
      }
    }

    user.position.x = getMyDeno().tx;
    user.position.y = getMyDeno().ty;
    setTimeout(update, 16);
  };

  update();
}

async function sendAlive() {
  await fetch("/api/send", {
    method: "POST",
    body: JSON.stringify({ user: user, type: "alive", body: "" }),
  });
}

let status = "";
const user: User = {
  id: generateUUID(),
  name: generateSaurs(),
  position: {
    x: 300,
    y: 300,
  },
  ts: 0,
};

setInterval(() => {
  if (status === "CONNECTED") {
    sendAlive();
  }
}, 2000);

const events = new EventSource("/api/listen");
events.addEventListener("open", () => (status = "CONNECTED"));
events.addEventListener("error", () => {
  switch (events.readyState) {
    case EventSource.OPEN:
      status = "CONNECTED";
      break;
    case EventSource.CONNECTING:
      status = "CONNECTING";
      break;
    case EventSource.CLOSED:
      status = "DISCONNECTED";
      break;
  }
});

events.addEventListener("message", (e) => {
  const msg = JSON.parse(e.data);
  console.log(msg);
  if (msg.type === "message") {
    userMessages[msg.user.id] = {
      id: msg.id,
      body: msg.body,
      ts: msg.ts,
      user: msg.user,
    };
    globalMessages.push({
      id: msg.id,
      body: msg.body,
      ts: msg.ts,
      user: msg.user,
    });
    globalMessages = globalMessages.slice(-10);

    globalMessageText.text = globalMessages
      .map((m) => `${m.user.name}: ${m.body}`)
      .join("\n");
  }

  if (msg.type === "alive") {
    let userDeno = userSpriteInstances[msg.user.id];

    if (!userDeno) {
      userDeno = createDenoInstance(msg.user.position.x, msg.user.position.y);
      app.stage.addChild(userDeno);
      userSpriteInstances[msg.user.id] = userDeno;
    }
    if (msg.user.id !== user.id) {
      userDeno.tx = msg.user.position.x;
      userDeno.ty = msg.user.position.y;
    }
    setMove(userDeno);

    users[msg.user.id] = msg.user;

    Object.keys(users).forEach((id) => {
      if (users[id].ts < Date.now() - 10 * 1000) {
        delete users[id];
        app.stage.removeChild(userSpriteInstances[id]);
      }
    });
  }
});
const background = PIXI.Sprite.from("bg.png", {});
background.scale.set(4);
background.x = 0;
background.y = 0;
app.stage.addChild(background);

PIXI.Loader.shared.add("deno.json").load(() => {
  setup(user);
});

async function sendMessage(message: string) {
  if (message.length === 0) {
    return;
  }
  await fetch("/api/send", {
    method: "POST",
    body: JSON.stringify({ user: user, type: "message", body: message }),
  });
}

document.querySelector("#messageForm")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const message = document.querySelector("#messageInput") as HTMLInputElement;
  const body = message.value;
  message.value = "";
  sendMessage(body);
});
