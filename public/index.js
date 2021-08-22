let timer

let app = new PIXI.Application({
  width: window.innerWidth,
  height: window.innerHeight,
  antialias: false,
  resolution: 1,
})
document.querySelector("#canvas").appendChild(app.view)
PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST

const background = PIXI.Sprite.from("http://127.0.0.1:5500/public/bg.png")
background.scale.set(4)
background.x = 0
background.y = 0
app.stage.addChild(background)

PIXI.Loader.shared.add("http://127.0.0.1:5500/public/deno.json").load(setup)

function setup() {
  const denoTextures = []
  for (let i = 0; i < 4; i++) {
    denoTextures.push(PIXI.Texture.from(`deno ${i}.aseprite`))
  }
  const deno = new PIXI.AnimatedSprite(denoTextures)

  deno.x = app.screen.width / 2
  deno.y = app.screen.height / 2
  deno.vx = 0
  deno.vy = 0
  deno.scale.set(4)

  deno.anchor.set(0.5)
  deno.animationSpeed = 0.1
  deno.play()

  app.stage.addChild(deno)

  app.stage.interactive = true
  const v = 5;
  app.stage.on("pointerdown", (e) => {
    const dx = e.data.global.x - deno.x;
    const dy = e.data.global.y - deno.y;
    const d2 = dx ** 2 + dy ** 2;
    const d = Math.sqrt(d2);
    const t = d / v;
    const vx = dx / t;
    const vy = dy / t;
    deno.vx = vx
    deno.vy = vy
    deno.tx = e.data.global.x
    deno.ty = e.data.global.y
    deno.play()

    if (deno.vx > 0) {
      deno.scale.x = 4
    } else {
      deno.scale.x = -4
    }
  })
  const update = () => {
    deno.x += deno.vx;
    deno.y += deno.vy;
    if (Math.abs(deno.tx - deno.x) <= Math.abs(deno.vx)) {
      deno.vx = 0
    }
    if (Math.abs(deno.ty - deno.y) <= Math.abs(deno.vy)) {
      deno.vy = 0
    }
    if(deno.vx === 0 && deno.vy === 0) {
      deno.gotoAndStop(0)
    }
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
        id: window.crypto.randomUUID(),
        name: generateSaurs(),
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
        this.$set(this.users, msg.user.id, msg.user)
        Object.keys(this.users).forEach(id => {
          // 1分以上古いデータを削除
          if (this.users[id].ts < Date.now() - 10 * 1000) {
            this.$delete(this.users, id)
          }
        })
      }
    });
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