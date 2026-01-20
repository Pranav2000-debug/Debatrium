import Redis from "ioredis";

// if (!globalThis._redis) {
//   globalThis._redis = new Redis({
//     host: "127.0.0.1",
//     port: 6379,
//     maxRetriesPerRequest: null,
//   });

//   globalThis._redis.on("connect", () => {
//     console.log("Redis ready");
//   });

//   globalThis._redis.on("error", (err) => {
//     console.error("Redis error:", err.message);
//   });
// }

// export const redis = globalThis._redis;

// redisConnection.js
// import Redis from "ioredis";

// const client = new Redis({
//   host: "localhost",
//   port: 6379,
// });

// client.on("connect", () => {
//   console.log("Redis client connected");
// });

// client.on("error", (err) => {
//   console.error("Redis error:", err);
// });

// export default client;
const PRIVATE_REDIS_KEY = Symbol("redis_class_key");
export default class RedisClient {
  static #instance = null;
  #client = null;

  constructor(key) {
    if (key !== PRIVATE_REDIS_KEY) throw new Error("Cannot create new instance");
    if (RedisClient.#instance) throw new Error("Use RedisClient.getInstance()");

    this.#client = new Redis({
      host: "127.0.0.1",
      port: 6379,
      maxRetriesPerRequest: null, // Required for BullMQ
      enableReadyCheck: false,
    });

    this.#client.on("connect", () => {
      console.log("Redis client connected");
    });
    this.#client.on("ready", () => {
      console.log("Redis client ready");
    });
    this.#client.on("error", (err) => {
      console.error("❌ Redis error:", err.message);
    });
    this.#client.on("close", () => {
      console.log("Redis connection closed");
    });
  }

  static getInstance() {
    if (!RedisClient.#instance) {
      RedisClient.#instance = new RedisClient(PRIVATE_REDIS_KEY);
    }
    return RedisClient.#instance;
  }

  getClient() {
    return this.#client;
  }

  // BullMQ recommends separate connections for Queue and Worker
  createNewConnection() {
    return new Redis({
      host: "127.0.0.1",
      port: 6379,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
  }
  // Graceful shutdown
  async disconnect() {
    if (this.#client) {
      await this.#client.quit();
      console.log("Redis client disconnected");
    }
  }
}
