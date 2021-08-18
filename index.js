let timer

new Vue({
  el: "#app",
  data() {
    return {
      message: "Hello",
      status: "",
      user: {
        id: window.crypto.randomUUID(),
        name: "anonymous",
      },
      users: {}
    }
  },
  methods: {
    send() {
      fetch("/api/send", {
        method: "POST",
        body: JSON.stringify({ user: this.user, type: "message", body: "Hello" }),
      })
    },
    async sendAlive() {
      await fetch("/api/send", {
        method: "POST",
        body: JSON.stringify({ user: this.user, type: "alive", body: "" }),
      })
      // console.log(await res.json())
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
      if(msg.type === "alive") {
        this.$set(this.users, msg.user.id, msg.user)
        // this.users[msg.user.id] = msg.user

        // this.usersの中で古いデータを削除
        Object.keys(this.users).forEach(id => {
          // 1分以上古いデータを削除
          if (this.users[id].ts < Date.now() - 10 * 1000) {
            this.$delete(this.users, id)
          }
        })

        // if (!this.users.(msg.user.id)) {
        //   this.$set(this.users, msg.user.id, msg.user)
        //   // this.users.set(user.id, user);
        // }
        // for (const [id, user] of this.users.entries()) {
        //   if (user.ts < new Date().getTime() - 1000 * 60 * 60) {
        //     this.$delete(this.users, id)
        //     // users.delete(id);
        //   }
        // }
      }
      console.log(e.data)
      // addMessage(JSON.parse(e.data));
    });
  }
});

