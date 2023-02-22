import { MongoClient, Collection } from 'mongodb'

class Database {
  private client: MongoClient
  constructor(uri: string) {
    this.client = new MongoClient(uri)
  }

  async connect(): Promise<void> {
    this.client.connect();
  }

  async disconnect(): Promise<void> {
    await this.client.close()
  }

  async getCollection({
    database,
    collection,
  }: {
    database: string;
    collection: string;
  }): Promise<Collection> {
    return this.client.db(database).collection(collection);
  }
}

export const MongoDatabase = new Database(process.env.MONGO_URI || 'mongodb://localhost:27017')


