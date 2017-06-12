var Globalize = require("globalize");

var messageFormatterSuper = Globalize.messageFormatter;

function sanitizePath(pathString) {
  return pathString.trim()
    .replace(/\{/g, "(")
    .replace(/\}/g, ")")
    .replace(/\//g, "|")
    .replace(/\n/g, " ")
    .replace(/ +/g, " ")
    .replace(/"/g, "'");
}

// Monkeypatch Globalize's `.formatMessage` to allow default message.
// `this` is the global Globalize object or an instance of Globalize
function messageFormatterWithDefaults(pathOrMessage) {
  var args = [].slice.call(arguments);
  var aux = {};
  var sanitizedPath = sanitizePath(pathOrMessage);

  // Globalize runtime
  if (!this.cldr) {
    // On runtime, the only way for deciding between using sanitizedPath or
    // pathOrMessage as path is by checking which formatter exists.
    args[0] = sanitizedPath;
    aux = globalizeMessageFormatter.apply(this, args);
    args[0] = pathOrMessage;
    return aux || globalizeMessageFormatter.apply(this, args);
  }

  var sanitizedPathExists = this.cldr.get(["globalize-messages/{bundle}", sanitizedPath]) !== undefined;
  var pathExists = this.cldr.get(["globalize-messages/{bundle}", pathOrMessage]) !== undefined;

  // Want to distinguish between default message and path value - just checking
  // for sanitizedPath won't be enough, because sanitizedPath !== pathOrMessage
  // for paths like "salutations/hi".
  if (!sanitizedPathExists && !pathExists) {
    aux[this.cldr.attributes.bundle] = {};
    aux[this.cldr.attributes.bundle][sanitizedPath] = pathOrMessage;
    Globalize.loadMessages(aux);
    sanitizedPathExists = true;
  }

  args[0] = pathExists ? pathOrMessage : sanitizedPath;
  return messageFormatterSuper.apply(this, args);
}

messageFormatterWithDefaults._overridden = true;

function set() {
  if (Globalize.messageFormatter._overridden) {
    console.warn("[default-globalize-messages] warning: messageFormatter is already overridden");
    return false;
  }

  Globalize.messageFormatter = Globalize.prototype.messageFormatter =
    messageFormatterWithDefaults;
  return true;
}

function unset() {
  Globalize.messageFormatter = Globalize.prototype.messageFormatter =
    messageFormatterSuper;
}

module.exports = {
  sanitizedPath: sanitizePath,
  set: set,
  unset: unset
};
