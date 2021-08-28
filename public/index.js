let timer

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

//generate uuid
function generateUUID() {
  var d = new Date().getTime();
  var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = (d + Math.random() * 16) % 16 | 0;
    d = Math.floor(d / 16);
    return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
  return uuid;
};



function setMove(x, y, deno) {
  // if same position, do nothing
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

const userSpriteInstances = {}

function setup(user) {
  for (let i = 0; i < 4; i++) {
    denoTextures0.push(PIXI.Texture.from(`deno ${i}.aseprite`))
  }
  for (let i = 4; i < 8; i++) {
    denoTextures1.push(PIXI.Texture.from(`deno ${i}.aseprite`))
  }
  const deno = new PIXI.AnimatedSprite(denoTextures0)

  deno.x = app.screen.width / 2
  deno.y = app.screen.height / 2
  deno.vx = 0
  deno.vy = 0
  deno.scale.set(4)

  deno.anchor.set(0.5)
  deno.animationSpeed = 0.15

  app.stage.addChild(deno)

  //add debug text
  const debugText = new PIXI.Text(`${user.name}`, {
    fontSize: 16,
  })
  debugText.x = 0
  debugText.y = 100
  app.stage.addChild(debugText)


  app.stage.interactive = true
  app.stage.on("pointerdown", (e) => {
    setMove(Math.round(e.data.global.x), Math.round(e.data.global.y), deno)
  })
  const update = () => {
    updateMove(deno)

    for (let sprite of Object.keys(userSpriteInstances)) {
      const spriteInstance = userSpriteInstances[sprite]
      updateMove(spriteInstance)
    }

    // display all denos position in debug text
    debugText.text = `${user.name} \n`
    for (let sprite of Object.keys(userSpriteInstances)) {
      const spriteInstance = userSpriteInstances[sprite]
      debugText.text += `${sprite} x:${spriteInstance.x} y:${spriteInstance.y} tx:${spriteInstance.tx} ty:${spriteInstance.ty} \n`
    }

    user.position.x = deno.tx
    user.position.y = deno.ty
    timer = setTimeout(update, 16)
  }
  update()

}


new Vue({
  el: "#app",
  data() {
    return {
      message: "",
      status: "",
      user: {
        id: generateUUID(),
        name: generateSaurs(),
        position: {
          x: 300,
          y: 300
        }
      },
      users: {},
      userMessages: {},
      globalMessages: [],
    }
  },
  methods: {
    async send() {
      if (this.message.length === 0) {
        return
      }
      await fetch("/api/send", {
        method: "POST",
        body: JSON.stringify({ user: this.user, type: "message", body: this.message }),
      })
      this.message = ""
    },
    async sendAlive() {
      await fetch("/api/send", {
        method: "POST",
        body: JSON.stringify({ user: this.user, type: "alive", body: "" }),

      })
    }
  },
  beforeDestroy() {
    clearInterval(timer)
  },
  mounted() {
    timer = setInterval(() => {
      if (this.status === "CONNECTED") {
        this.sendAlive()
      }
    }, 2000);

    const events = new EventSource("/api/listen");
    events.addEventListener("open", () => this.status = "CONNECTED");
    events.addEventListener("error", () => {
      switch (events.readyState) {
        case EventSource.OPEN:
          this.status = "CONNECTED"
          break;
        case EventSource.CONNECTING:
          this.status = "CONNECTING"
          break;
        case EventSource.CLOSED:
          this.status = "DISCONNECTED"
          break;
      }
    });
    events.addEventListener("message", (e) => {
      const msg = JSON.parse(e.data)
      if (msg.type === "message") {
        this.userMessages[msg.user.id] = {
          id: msg.id,
          body: msg.body,
          ts: msg.ts,
        }
        this.globalMessages.push({
          id: msg.id,
          body: msg.body,
          ts: msg.ts,
          user: msg.user,
        })
        this.globalMessages = this.globalMessages.slice(-10)
      }
      if (msg.type === "alive") {
        //もし、この人がいないならspriteを追加
        let user = this.users[msg.user.id]
        let userDeno = userSpriteInstances[msg.user.id]
        if (!userDeno) {
          //animated spriteを作成
          userDeno = new PIXI.AnimatedSprite(denoTextures0)
          userDeno.anchor.set(0.5)
          app.stage.addChild(userDeno)
          userSpriteInstances[msg.user.id] = userDeno
        } else {
        }

        console.log(msg)
        setMove(msg.user.position.x, msg.user.position.y, userDeno)

        // userDeno.x = msg.user.position.x
        // userDeno.y = msg.user.position.y
        // userDeno.play()

        this.$set(this.users, msg.user.id, msg.user)
        Object.keys(this.users).forEach(id => {
          // 1分以上古いデータを削除
          if (this.users[id].ts < Date.now() - 10 * 1000) {
            this.$delete(this.users, id)
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

    PIXI.Loader.shared.add("deno.json").load(() => { setup(this.user) })
  }
});


function generateSaurs() {
  const fruits = [
    "apple",
    "banana",
    "cherry",
    "durian",
    "elderberry",
    "fig",
    "grape",
    "huckleberry",
    "jackfruit",
    "kiwi",
    "lemon",
    "mango",
    "nectarine",
    "orange",
    "papaya",
    "quince",
    "raspberry",
    "strawberry",
    "tangerine",
    "watermelon",
    "zucchini",
  ]
  const animals = [
    "alligator",
    "ant",
    "bear",
    "bee",
    "bird",
    "camel",
    "cat",
    "cheetah",
    "chicken",
    "chimpanzee",
    "cow",
    "crocodile",
    "deer",
    "dog",
    "dolphin",
    "duck",
    "eagle",
    "elephant",
    "fish",
    "fly",
    "fox",
    "frog",
    "giraffe",
    "goat",
    "goldfish",
    "hamster",
    "hippopotamus",
    "horse",
    "kangaroo",
    "kitten",
    "lion",
    "lobster",
    "monkey",
    "octopus",
    "owl",
    "panda",
    "pig",
    "puppy",
    "rabbit",
    "rat",
    "scorpion",
    "seal",
    "shark",
    "sheep",
    "snail",
    "snake",
    "spider",
    "squirrel",
    "tiger",
    "turtle",
    "wolf",
    "zebra",
  ]

  const words = [...fruits, ...animals]
  const name = words[Math.floor(Math.random() * words.length)]
  return `${name}saurs`
}