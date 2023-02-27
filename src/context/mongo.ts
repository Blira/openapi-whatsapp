import { MongoClient } from 'mongodb'

export const ContextDatabase = {
  client: null as unknown as MongoClient,
  uri: null as unknown as string,

  async connect(uri: string): Promise<void> {
    this.uri = uri;
    this.client = await MongoClient.connect(uri, {});
  },
  async disconnect(): Promise<void> {
    await this.client.close();
  },
  async find() {
    return this.client.db('623b6ab120f7e70949d06250').collection('user-context').findOne({ code: '551' })
  },
  async findPhoneNumber(phoneNumber: string) {
    return this.client.db('e3-base').collection('user').findOne({ phoneNumber })
  },
}