new Vue({
  el: "#app",
  data() {
    return {
      message: "Hello",
      status: "",
    }
  },
  methods: {
    send(){
      fetch("/api/send", {
        method: "POST",
        body: JSON.stringify({ user: "user", body: "message" }),
      })
    }
  },
  mounted() {
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
      console.log(e.data)

      // addMessage(JSON.parse(e.data));
    });
  }
});

