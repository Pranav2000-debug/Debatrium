import Redis from "ioredis";

const PRIVATE_REDIS_KEY = Symbol("redis_class_key");
export default class RedisClient {
  static #instance = null;
  #sharedWorkerClient = null;

  constructor(key) {
    if (key !== PRIVATE_REDIS_KEY) throw new Error("Cannot create new instance");
    if (RedisClient.#instance) throw new Error("Use RedisClient.getInstance()");

    this.#sharedWorkerClient = new Redis({
      host: "127.0.0.1",
      port: 6379,
      maxRetriesPerRequest: null, // Required for BullMQ
      enableReadyCheck: false,
    });

    this.#sharedWorkerClient.on("connect", () => {
      console.log("Redis worker client connected");
    });
    this.#sharedWorkerClient.on("ready", () => { 
      console.log("Redis workerclient ready");
    });
    this.#sharedWorkerClient.on("error", (err) => {
      console.error("❌ Redis error:", err.message);
    });
    this.#sharedWorkerClient.on("close", () => {
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
    return this.#sharedWorkerClient;
  }

  // BullMQ recommends separate connections for Queue and Worker
  createNewConnection() {
    return new Redis({
      host: "127.0.0.1",
      port: 6379,
      maxRetriesPerRequest: 1, // fail fast
    });
  }
  // Graceful shutdown
  async disconnect() {
    if (this.#sharedWorkerClient) {
      await this.#sharedWorkerClient.quit();
      console.log("Redis client disconnected");
    }
  }
}
