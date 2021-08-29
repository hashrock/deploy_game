let timer

declare const PIXI: any;
declare const window: any;
declare const document: any;
declare const EventSource: any;
type Texture = unknown


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
  textures?: Texture[]
  gotoAndStop?: () => void
  play?: () => void
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
const denoTextures0: Texture[] = []
const denoTextures1: Texture[] = []

function setMove(deno: DenoSprite) {
  // if same position, do nothing
  deno.vx = 0
  deno.vy = 0

  // if (deno.tx === x && deno.ty === y) {
  //   deno.tx = x
  //   deno.ty = y
  //   return
  // }

  const dx = deno.tx - deno.x;
  const dy = deno.ty - deno.y;
  const d2 = dx ** 2 + dy ** 2;
  const d = Math.sqrt(d2);
  if (d !== 0) {
    const t = d / DENO_SPEED;

    const vx = dx / t;
    const vy = dy / t;
    deno.vx = Math.round(vx)
    deno.vy = Math.round(vy)
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
  //@ts-ignore
  deno.play()
}

function updateMove(deno: DenoSprite) {
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
    //@ts-ignore
    deno.gotoAndStop(0)
  }
}
interface User {
  id: string
  name: string
  position: {
    x: number
    y: number
  }
  ts: number
}


const userSpriteInstances: Record<string, DenoSprite> = {}
// let myDeno: DenoSprite = {
//   x: 0,
//   y: 0,
//   vx: 0,
//   vy: 0,
//   tx: 0,
//   ty: 0,
// }

function getMyDeno(){
  return userSpriteInstances[user.id]
}

function createDenoInstance(x: number, y: number){
  const deno = new PIXI.AnimatedSprite(denoTextures0)
  deno.x = x
  deno.y = y
  deno.vx = 0
  deno.vy = 0
  deno.tx = x
  deno.ty = y
  deno.anchor.set(0.5)
  deno.animationSpeed = 0.5
  deno.scale.set(4)
  deno.play()
  return deno
}


const users:Record<string, User> = {}
function setup(user: User) {
  for (let i = 0; i < 4; i++) {
    denoTextures0.push(PIXI.Texture.from(`deno ${i}.aseprite`))
  }
  for (let i = 4; i < 8; i++) {
    denoTextures1.push(PIXI.Texture.from(`deno ${i}.aseprite`))
  }
  const randomx = Math.floor(Math.random() * app.stage.width)
  const randomy = Math.floor(Math.random() * app.stage.height)

  const deno = createDenoInstance(randomx, randomy)
  userSpriteInstances[user.id] = deno

  app.stage.addChild(deno)

  //add debug text
  const debugText = new PIXI.Text(`${user.name}`, {
    fontSize: 16,
  })
  debugText.x = 0
  debugText.y = 100
  app.stage.addChild(debugText)


  app.stage.interactive = true
  app.stage.on("pointerdown", (e: any) => {
    const myDeno = getMyDeno()
    myDeno.tx = e.data.global.x
    myDeno.ty = e.data.global.y
    setMove(myDeno)
  })
  const update = () => {
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

    user.position.x = getMyDeno().tx
    user.position.y = getMyDeno().ty
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
const user: User = {
  id: generateUUID(),
  name: generateSaurs(),
  position: {
    x: 300,
    y: 300
  },
  ts: 0
}


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
events.addEventListener("message", (e: any) => {
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
    let userDeno = userSpriteInstances[msg.user.id]

    if (!userDeno) {
      userDeno = createDenoInstance(msg.user.position.x, msg.user.position.y)
      app.stage.addChild(userDeno)
      userSpriteInstances[msg.user.id] = userDeno
    }
    if(msg.user.id !== user.id){
      userDeno.tx = msg.user.position.x
      userDeno.ty = msg.user.position.y
    }
    setMove(userDeno)

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
