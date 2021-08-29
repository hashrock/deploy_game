let timer

declare const PIXI: any;

interface DenoSprite {
  x: number
  y: number
  vx: number
  vy: number
  tx: number
  ty: number
  scale?: any
  anchor?: any
  animationSpeed?: number
}

import { generateSaurs, generateUUID } from "./util.ts"

let app = new PIXI.Application({
  width: window.innerWidth,
  height: window.innerHeight,
  antialias: false,
  resolution: 1,
})
document.querySelector("#canvas").appendChild(app.view)
PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST

const DENO_SPEED = 5;
const denoTextures0 = []
const denoTextures1 = []

function setMove(x, y, deno) {
  // if same position, do nothing
  deno.vx = 0
  deno.vy = 0

  if (deno.tx === x && deno.ty === y) {
    deno.tx = x
    deno.ty = y
    return
  }

  const dx = x - deno.x;
  const dy = y - deno.y;
  const d2 = dx ** 2 + dy ** 2;
  const d = Math.sqrt(d2);
  if (d !== 0) {
    const t = d / DENO_SPEED;

    const vx = dx / t;
    const vy = dy / t;
    deno.vx = Math.round(vx)
    deno.vy = Math.round(vy)
    deno.tx = x
    deno.ty = y

  }

  deno.scale.y = 4
  if (deno.vx > 0) {
    deno.scale.x = 4
  } else {
    deno.scale.x = -4
  }
  if (deno.vy > 0) {
    deno.textures = denoTextures0
  } else {
    deno.textures = denoTextures1
  }
  deno.play()
}

function updateMove(deno) {
  deno.x += deno.vx;
  deno.y += deno.vy;
  if (Math.abs(deno.tx - deno.x) <= Math.abs(deno.vx)) {
    deno.vx = 0
    deno.x = deno.tx
  }
  if (Math.abs(deno.ty - deno.y) <= Math.abs(deno.vy)) {
    deno.vy = 0
    deno.y = deno.ty
  }
  if (deno.vx === 0 && deno.vy === 0) {
    deno.gotoAndStop(0)
  }
}
interface User {
  name: string
  position: {
    x: number
    y: number
  }
}


const userSpriteInstances: Record<string, DenoSprite> = {}
let myDeno: DenoSprite = {
  x: 0,
  y: 0,
  vx: 0,
  vy: 0,
  tx: 0,
  ty: 0,

}

function setup(user) {
  for (let i = 0; i < 4; i++) {
    denoTextures0.push(PIXI.Texture.from(`deno ${i}.aseprite`))
  }
  for (let i = 4; i < 8; i++) {
    denoTextures1.push(PIXI.Texture.from(`deno ${i}.aseprite`))
  }
  myDeno = new PIXI.AnimatedSprite(denoTextures0)

  myDeno.x = app.screen.width / 2
  myDeno.y = app.screen.height / 2
  myDeno.vx = 0
  myDeno.vy = 0
  myDeno.scale.set(4)

  myDeno.anchor.set(0.5)
  myDeno.animationSpeed = 0.15

  app.stage.addChild(myDeno)

  //add debug text
  const debugText = new PIXI.Text(`${user.name}`, {
    fontSize: 16,
  })
  debugText.x = 0
  debugText.y = 100
  app.stage.addChild(debugText)


  app.stage.interactive = true
  app.stage.on("pointerdown", (e) => {
    setMove(Math.round(e.data.global.x), Math.round(e.data.global.y), myDeno)
  })
  const update = () => {
    updateMove(myDeno)

    for (let sprite of Object.keys(userSpriteInstances)) {
      const spriteInstance = userSpriteInstances[sprite]
      updateMove(spriteInstance)
    }

    // display all denos position in debug text
    debugText.text = `${user.name} \n`
    for (let sprite of Object.keys(userSpriteInstances)) {
      const spriteInstance = userSpriteInstances[sprite]
      debugText.text += `${sprite} x:${spriteInstance.x} y:${spriteInstance.x} tx:${spriteInstance.tx} ty:${spriteInstance.ty} \n`
    }

    user.position.x = myDeno.tx
    user.position.y = myDeno.ty
    timer = setTimeout(update, 16)
  }
  update()

}

async function sendAlive() {
  await fetch("/api/send", {
    method: "POST",
    body: JSON.stringify({ user: user, type: "alive", body: "" }),
  })
}

let status = ""
const user = {
  id: generateUUID(),
  name: generateSaurs(),
  position: {
    x: 300,
    y: 300
  }
}
const users = []

timer = setInterval(() => {
  if (status === "CONNECTED") {
    sendAlive()
  }
}, 2000);

const events = new EventSource("/api/listen");
events.addEventListener("open", () => status = "CONNECTED");
events.addEventListener("error", () => {
  switch (events.readyState) {
    case EventSource.OPEN:
      status = "CONNECTED"
      break;
    case EventSource.CONNECTING:
      status = "CONNECTING"
      break;
    case EventSource.CLOSED:
      status = "DISCONNECTED"
      break;
  }
});
events.addEventListener("message", (e) => {
  const msg = JSON.parse(e.data)
  // if (msg.type === "message") {
  //   userMessages[msg.user.id] = {
  //     id: msg.id,
  //     body: msg.body,
  //     ts: msg.ts,
  //   }
  //   globalMessages.push({
  //     id: msg.id,
  //     body: msg.body,
  //     ts: msg.ts,
  //     user: msg.user,
  //   })
  //   globalMessages = globalMessages.slice(-10)
  // }
  if (msg.type === "alive") {
    // let user = users[msg.user.id]
    let userDeno = userSpriteInstances[msg.user.id]
    if (!userDeno && msg.user.id !== user.id) {
      //animated spriteを作成
      userDeno = new PIXI.AnimatedSprite(denoTextures0)
      userDeno.anchor.set(0.5)
      userDeno.vx = 0
      userDeno.vy = 0
      userDeno.tx = 0
      userDeno.ty = 0

      app.stage.addChild(userDeno)
      userSpriteInstances[msg.user.id] = userDeno
    }
    setMove(msg.user.position.x, msg.user.position.y, userDeno)

    // userDeno.x = msg.user.position.x
    // userDeno.y = msg.user.position.y
    // userDeno.play()
    users[msg.user.id] = msg.user

    Object.keys(users).forEach(id => {
      // 1分以上古いデータを削除
      if (users[id].ts < Date.now() - 10 * 1000) {
        delete users[id]
        //animated spriteを削除
        app.stage.removeChild(userSpriteInstances[id])
      }
    })

  }
});
const background = PIXI.Sprite.from("bg.png")
background.scale.set(4)
background.x = 0
background.y = 0
app.stage.addChild(background)

PIXI.Loader.shared.add("deno.json").load(() => { setup(user) })