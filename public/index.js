let timer

let app = new PIXI.Application({
  width: window.innerWidth,
  height: window.innerHeight,
  antialias: false,
  resolution: 1,
})
document.querySelector("#canvas").appendChild(app.view)
PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST
// Add map.jpg to the background
const background = PIXI.Sprite.from("http://127.0.0.1:5500/public/denoland.jpg")
background.width = app.screen.width * 2
background.height = app.screen.height * 2
background.x = 0
background.y = 0
app.stage.addChild(background)



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