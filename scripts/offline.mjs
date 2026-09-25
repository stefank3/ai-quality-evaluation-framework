/** Deterministic network-denial preload. Invoked by npm tasks and Vitest setup; no args,
 * env or files. Replaces Node fetch/socket/HTTP/DNS entry points before application imports.
 * Attempts throw a fixed error (task exits nonzero if uncaught). Child Node tasks inherit
 * NODE_OPTIONS from tasks.mjs. Covered main/child-process paths prevent accidental egress;
 * this is not an OS sandbox. Worker threads are outside the supported execution model. */
import { syncBuiltinESMExports } from "node:module";
import net from "node:net";
import tls from "node:tls";
import http from "node:http";
import https from "node:https";
import http2 from "node:http2";
import dgram from "node:dgram";
import dns from "node:dns";

/** Fail before a network operation, without including hostnames or payloads. */
function deny() {
  throw new Error(
    "NETWORK_DISABLED: deterministic task prohibits network access.",
  );
}
globalThis.fetch = deny;
globalThis.WebSocket = class {
  constructor() {
    deny();
  }
};
net.connect = deny;
net.createConnection = deny;
net.Socket.prototype.connect = deny;
tls.connect = deny;
http.request = deny;
http.get = deny;
https.request = deny;
https.get = deny;
http2.connect = deny;
dgram.createSocket = deny;
dgram.Socket.prototype.send = deny;
dgram.Socket.prototype.connect = deny;
for (const surface of [
  dns,
  dns.promises,
  dns.Resolver.prototype,
  dns.promises.Resolver.prototype,
]) {
  for (const key of Object.getOwnPropertyNames(surface)) {
    if (
      key.startsWith("resolve") ||
      key === "lookup" ||
      key === "lookupService" ||
      key === "reverse"
    )
      surface[key] = deny;
  }
}
syncBuiltinESMExports();
