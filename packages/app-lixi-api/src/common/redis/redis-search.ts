import { Redis } from 'ioredis';
import { EventEmitter } from 'stream';

const keyPrefix = 'lixilotus:';

export default class ReSearch extends EventEmitter {
  commands = ['FT.CREATE', 'JSON.SET', 'FT.SEARCH', 'FT._LIST', 'FT.INFO', 'FT.DROPINDEX', 'FT.ALTER'];
  cmds: any = {};
  client: Redis;
  constructor(redis: Redis) {
    super();
    this.client = redis;
    this.commands.forEach(command => {
      const cmd = redis.createBuiltinCommand(command) as {
        string: any;
        buffer: any;
      };
      this.cmds[command] = cmd.string;
      this.cmds[`${command}Buffer`] = cmd.buffer;
    });
  }

  /**
   * Creates a new index in RedisSearch.
   *
   * @param indexName - The name of the index to be created. This will be used as a reference to perform searches and other operations.
   * @param isJSON - Set the data structure of index. true: JSON - false: HASH.
   * @param prefix - Prefix array. Example: ['1', 'item:']
   * @param schema - The schema object definition for the index. example: {name: 'TEXT'}
   *
   */
  create(indexName: string, isJSON: boolean, prefix: string[], schema: any): Promise<boolean> {
    const cmd = this.cmds['FT.CREATE'];
    let strType = '';
    let schemaCreated = [];
    if (isJSON) {
      strType = 'JSON';
      schemaCreated = this.convertSchema(strType, schema);
    } else {
      strType = 'HASH';
      schemaCreated = this.convertSchema(strType, schema);
    }

    //if have prefix, add 'PREFIX' to start and add lixilotus: to each prefix
    if (prefix.length > 0) {
      //add prefix lixilotus:
      prefix.forEach((item, index) => {
        //first index is number prefix
        if (index === 0) return;
        prefix[index] = `${keyPrefix}${item}`;
      });

      prefix.unshift('PREFIX');
    }
    return cmd.call(this.client, indexName, 'ON', strType, ...prefix, 'SCHEMA', ...schemaCreated);
  }

  async ensureFieldExistsInIndex(indexName: string, fieldName: string, fieldType: string): Promise<boolean> {
    try {
      // Get index info
      const indexInfo = await this.info(indexName);

      // Find the attributes section in the response
      // FT.INFO returns an array where even indices are keys and odd indices are values
      let attributesArray = null;
      for (let i = 0; i < indexInfo.length; i += 2) {
        if (indexInfo[i] === 'attributes') {
          attributesArray = indexInfo[i + 1];
          break;
        }
      }

      if (!attributesArray || !Array.isArray(attributesArray)) {
        return false;
      }

      // Check if our field exists in the attributes array
      let fieldExists = false;

      for (const attribute of attributesArray) {
        if (Array.isArray(attribute)) {
          // check field: example return-currency: ['identifier', '$.currency', 'attribute','currency', 'type', 'TEXT', 'WEIGHT', '1']
          if (attribute[1] === `$.${fieldName}` || attribute[3] === fieldName) {
            fieldExists = true;
            break;
          }
        }
      }

      // Add the field if it doesn't exist
      if (!fieldExists) {
        const cmd = this.cmds['FT.ALTER'];
        await cmd.call(this.client, indexName, 'SCHEMA', 'ADD', `$.${fieldName}`, 'AS', fieldName, fieldType);
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  list(): Promise<string[]> {
    const cmd = this.cmds['FT._LIST'];
    return cmd.call(this.client);
  }

  async exist(indexName: string): Promise<boolean> {
    return (await this.list()).includes(indexName);
  }

  async info(indexName: string): Promise<string[]> {
    const cmd = this.cmds['FT.INFO'];
    const exist = await this.exist(indexName);
    if (!exist) return [];
    return cmd.call(this.client, indexName);
  }

  async drop(indexName: string): Promise<boolean> {
    const cmd = this.cmds['FT.DROPINDEX'];
    const exist = await this.exist(indexName);
    if (!exist) return false;
    return cmd.call(this.client, indexName);
  }

  async dropAll(): Promise<boolean> {
    try {
      const listIndex = await this.list();
      for (let i = 0; i < listIndex.length; i++) {
        await this.drop(listIndex[i]);
      }
      return true;
    } catch (err) {
      return false;
    }
  }

  /**
   * Add a document to RedisSearch.
   *
   * @param indexName - The name of the index.
   * @param keyName - The name of the document.
   * @param document - Data will be added
   *
   */
  async add(nameIndex: string, keyName: string, document: any): Promise<boolean> {
    const typeIndex = await this.getIndexType(nameIndex);
    if (typeIndex === null) return false;

    switch (typeIndex) {
      case 'JSON':
        const cmd = this.cmds['JSON.SET'];
        return cmd.call(this.client, `${keyPrefix}${keyName}`, '$', JSON.stringify(document));
      case 'HASH':
        return !!(await this.client.hset(`${keyName}`, document));
      default:
        return false;
    }
  }

  async search(indexName: string, query: string): Promise<string[]> {
    const cmd = this.cmds['FT.SEARCH'];
    const exist = await this.exist(indexName);
    if (!exist) return [];
    return cmd.call(this.client, indexName, query);
  }

  async getIndexType(indexName: string): Promise<string | null> {
    try {
      const info = await this.info(indexName);
      // Find the index_definition section
      const indexDefIdx = info.indexOf('index_definition');
      if (indexDefIdx === -1) {
        return null;
      }

      // Extract the index_definition section
      const indexDef = info[indexDefIdx + 1];

      // Find the key_type within the index_definition
      const keyTypeIdx = indexDef.indexOf('key_type');
      if (keyTypeIdx === -1) {
        return null;
      }

      // Extract the key_type value
      const keyType = indexDef[keyTypeIdx + 1];
      return keyType;
    } catch (error) {
      return null;
    }
  }
  convertSchema(strType: string, schema: any) {
    let convertedSchema: any = [];

    switch (strType) {
      case 'JSON':
        convertedSchema = Object.entries(schema).flatMap(([field, attributes]) => {
          // Split attributes into parts
          const parts = (attributes as string).split(' ');

          // make it array
          const basicFormat = [
            `$.${field}`,
            'AS',
            field,
            ...parts // Type (e.g., ['$.name', 'AS', 'TEXT'])
          ];

          return [...basicFormat];
        });
        break;
      case 'HASH':
        convertedSchema = Object.entries(schema).flatMap(([field, type]) => [field, type]);
        break;
      default:
        return [];
    }
    return convertedSchema;
  }
}
