import { Document, model, Schema } from "mongoose";
import type { UserEconomyTypes } from "../typings/typings";

/** The mongodb model structure. This is required to use with this package*/
export interface UserEconomyStructure extends Document {
  /**
   * The Mongodb Document ID.
   *
   * This is different from the internal _id in mongodb and is used with our DatabaseController class.
   */
  id: string;
  /** Our object for all our user settings. */
  settings: UserEconomyTypes;
}

const schema = new Schema<UserEconomyStructure>(
  {
    id: {
      type: String,
      required: true,
    },
    settings: {
      type: Object,
      require: true,
    },
  },
  { minimize: true, timestamps: true }
) as Schema;

export const UserDataSchema = model<UserEconomyStructure>(
  // The name of your mongodb collection
  "lewd-labs-economy",
  // passing the schema object to mongodb
  schema
);
