/* Chat data layer using Firebase Realtime Database. */
window.Chat = (function () {
  var ref = firebase.database().ref("chats/messages");
  var listeners = [];

  function listen(callback) {
    ref.on("child_added", function (snapshot) {
      var msg = snapshot.val();
      callback(msg);
      listeners.push(callback);
    });
  }

  function send(message) {
    message.status = message.status || "sent";
    var promise = ref.push(message);
    setTimeout(function () {
      ref.orderByChild("senderId").equalTo(message.senderId).once("value", function (snapshot) {
        snapshot.forEach(function (child) {
          if (child.val().status === "sent") {
            ref.child(child.key).update({ status: "delivered" });
          }
        });
      });
    }, 1000);
    return promise;
  }

  function updateStatus(messageId, status) {
    return ref.child(messageId).update({ status: status });
  }

  function markAllRead() {
    return ref.once("value", function (snapshot) {
      snapshot.forEach(function (child) {
        var msg = child.val();
        if (msg.status !== "read") {
          ref.child(child.key).update({ status: "read" });
        }
      });
    });
  }

  function stop() {
    ref.off();
    listeners = [];
  }

  return {
    listen: listen,
    send: send,
    updateStatus: updateStatus,
    markAllRead: markAllRead,
    stop: stop,
  };
})();
