import type { Model } from "mongoose";
import { IDataBaseController } from ".";
import { IEconomy } from "../economy";
import { UserDataSchema, UserEconomyStructure } from "./schema";
import type { key_db_options } from "./types";
import { Logger } from "../util/logger";

/**
 * The Database Controller manages the main functionality of the database and our cache system.
 */
export class DataBaseController extends IDataBaseController {
  /** Allows native db functions to access the economy config constructor */
  public config = new IEconomy().config;
  public constructor(model?: Model<any>) {
    super();
    // if a model is  inserted then use that and not the default
    if (model) {
      this.model = model;
    } else {
      if (this.config.debug)
        Logger.info(
          "[DB] using default economy model. Pass a model to the constructor to use a custom model."
        );
      this.model = UserDataSchema;
    }
  }

  /**
   * Saves all the mongodb documents to our cache after starting the db.
   */
  public async init(): Promise<{
    cache: (UserEconomyStructure & { _id: any })[];
  }> {
    const Cache = await this.model.find();
    for (const i in Cache) {
      const cache = Cache[i];
      if (this.config.debug)
        Logger.info(`[DB] loaded cache index[${i}] with value of: ${cache}`);
      this.items.set(cache.id, cache.settings);
    }
    return {
      cache: Cache,
    };
  }
  /**
   * Gets a value from our cache.
   * Keep in mind if the data is not in the cache you have to fetch the entire document.
   * @param {string} id - ID of document.
   * @param {string} key - The key to get.
   * @param {any} [defaultValue] - Default value if not found or null.
   * @returns {any}
   */
  public get(id: string, key: key_db_options, defaultValue: any): any {
    if (this.items.has(id)) {
      const value = this.items.get(id)[key];
      if (this.config.debug) Logger.info(`[DB] get cache[${id}] key[${key}]`);
      return value == null ? defaultValue : value;
    } else {
      if (this.config.debug)
        Logger.warn(
          `[DB] get cache[${id}] key[${key}] not found. Returning default value.`
        );
      return defaultValue;
    }
  }
  /**
   * Sets a value in our cache and db.
   * @param {string} id - ID of document
   * @param {string} key - The key to set.
   * @param {any} value - The value.
   * @returns {Promise<any>} - Mongoose query object|document
   */
  public async set(id: string, key: key_db_options, value: any): Promise<any> {
    // gets the cache first before writing to the db
    const data = this.items.get(id) || {};
    data[key] = value;
    this.items.set(id, data);

    if (this.config.debug)
      Logger.info(`[DB] set cache[${id}] key[${key}] value[${value}]`);

    const doc = (await this.getDocument(id)) as any;
    doc.settings[key] = value;
    doc.markModified("settings");
    return doc.save();
  }

  /**
   * Deletes a value from our cache and db.
   * This is not the same as the clear function. This will only delete a settings[key] field
   * @param {string} id - ID of document
   * @param {string} key - The key to delete.
   * @returns {Promise<any>} - Mongoose query object|document
   */
  public async delete(id: string, key: key_db_options): Promise<any> {
    const data = this.items.get(id) || {};
    delete data[key];

    if (this.config.debug) Logger.info(`[DB] delete cache[${id}] key[${key}]`);

    const doc = (await this.getDocument(id)) as any;
    delete doc.settings[key];
    doc.markModified("settings");
    return doc.save();
  }

  /**
   * Removes a document from our cache and db.
   * @param {string} id - ID of document
   * @returns {Promise<void>}
   */
  public async clear(id: string): Promise<void> {
    this.items.delete(id);
    if (this.config.debug) Logger.warn(`[DB] document destroyed [${id}]`);
    const doc = await this.getDocument(id);
    if (doc) await doc.remove();
  }

  /**
   * Gets a document from the mongodb servers and not cache.
   * @param {string} id - ID of document
   * @returns {Document<any, any, any>} - Mongoose query object|document
   */
  public async getDocument(id: string) {
    const obj = await this.model.findOne({ id });
    // if no document is found in our db, create one and return that default data.
    if (!obj) {
      // eslint-disable-next-line new-cap
      let defaultDoc = await new this.model({
        id,
        settings: {
          balance: {
            wallet: 0,
            bank: 0,
          },
          bankLimit: this.config.defaultBankLimit || 20000,
          daily: {
            dailyStreak: 0,
            dailyTimeout: 0,
          },
          itemsOwned: [],
          weekly: {
            weeklyStreak: 0,
            weeklyTimeout: 0,
          },
          monthly: {
            monthlyStreak: 0,
            monthlyTimeout: 0,
          },
          jobConfig: {
            workTimeOut: 60000 * 60 * 24,
          },
        },
      }).save({ timestamps: true });
      if (this.config.debug)
        Logger.info(
          `[DB] creating document[${id}] with default . ${JSON.stringify(
            defaultDoc
          )}`
        );
      return defaultDoc;
    } else {
      if (this.config.debug)
        Logger.info(`[DB] returning document[${id}] ${obj.settings}`);
      return obj;
    }
  }
}
