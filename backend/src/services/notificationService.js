let _io = null;

const setIo = (io) => { _io = io; };

const notifyFundiLocation = async (userId, data) => {
  if (_io) _io.to(`user:${userId}`).emit("fundi_location", data);
};

const notifyNewMessage = async (userId, data) => {
  if (_io) _io.to(`user:${userId}`).emit("new_message_notification", data);
};

const notifyClient = async (userId, event, data) => {
  if (_io) _io.to(`user:${userId}`).emit(event, data);
};

const notifyFundi = async (userId, event, data) => {
  if (_io) _io.to(`user:${userId}`).emit(event, data);
};

module.exports = { setIo, notifyFundiLocation, notifyNewMessage, notifyClient, notifyFundi };
