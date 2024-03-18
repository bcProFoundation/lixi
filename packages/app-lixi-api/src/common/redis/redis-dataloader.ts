import DataLoader from 'dataloader';
import stringify from 'json-stable-stringify';
import _ from 'lodash';
import { Redis } from 'ioredis';

const mapPromise = <T, U>(values: T[], fn: (val: T, index: number) => Promise<U>) => {
  return Promise.all(values.map(fn));
};

type RedisDataloaderOptions<K, V, C = K> = {
  expire?: number;
  serialize?: (val: V) => string;
  deserialize?: (val: string | null | Buffer) => V | Error;
  cacheKeyFn?: (key: K) => K | string;
  buffer?: boolean;
};

export class RedisDataLoader<K, V, C = K> {
  private _cacheKeyFn: (k: K) => K | string;

  private keySpace: string;
  private loader: DataLoader<K, any>;
  private opt: RedisDataloaderOptions<K, V>;
  private redis: Redis;

  constructor(redis: Redis, ks: string, userLoader: DataLoader<K, V>, opt: RedisDataloaderOptions<K, V>) {
    const customOptions = ['expire', 'serialize', 'deserialize', 'cacheKeyFn', 'buffer'];
    this.redis = redis;
    this.opt = _.pick(opt, customOptions) || {};
    this._cacheKeyFn = this.opt.cacheKeyFn || ((k: K) => (_.isObject(k) ? stringify(k) : k));

    this.keySpace = ks;
    this.loader = new DataLoader(
      keys =>
        this.rMGet(this.keySpace, keys as K[]).then(results =>
          mapPromise(results as V[], (v, i) => {
            if (v === '') {
              return Promise.resolve(null);
            } else if (v === null) {
              return userLoader
                .load(keys[i])
                .then(resp => this.rSetAndGet(this.keySpace, keys[i], resp, this.opt))
                .then(r => (r === '' ? null : (r as V)));
            } else {
              return Promise.resolve(v);
            }
          })
        ),
      _.chain(opt).omit(customOptions).extend({ cacheKeyFn: this.opt.cacheKeyFn }).value()
    );
  }

  parse(resp: any) {
    return new Promise((resolve, reject) => {
      try {
        if (resp === '' || resp === null || resp === undefined) {
          resolve(resp);
        } else if (this.opt.deserialize) {
          resolve(this.opt.deserialize(resp));
        } else {
          if (Buffer.isBuffer(resp)) {
            resp = resp.toString();
          }
          resolve(JSON.parse(resp));
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  toString(val: V): Promise<string> {
    if (val === null) {
      return Promise.resolve('');
    } else if (this.opt.serialize) {
      return Promise.resolve(this.opt.serialize(val));
    } else if (_.isObject(val)) {
      return Promise.resolve(JSON.stringify(val));
    } else {
      return Promise.reject(new Error('Must be Object or Null'));
    }
  }

  private makeKey<K>(keySpace: string, key: K, cacheKeyFn: (key: K) => K | string) {
    return `${keySpace ? keySpace + ':' : ''}${cacheKeyFn(key)}`;
  }

  rGet(keySpace: string, key: K, opt: RedisDataloaderOptions<K, V>) {
    return new Promise((resolve, reject) =>
      (opt.buffer ? this.redis.getBuffer : this.redis.get)(
        this.makeKey(keySpace, key, this._cacheKeyFn),
        (err, result) => (err ? reject(err) : this.parse(result).then(resolve))
      )
    );
  }

  private rMGet(keySpace: string, keys: K[]) {
    if (this.opt.buffer) {
      // Have to use multi.getBuffer instead of mgetBuffer
      // because mgetBuffer throws an error.
      return new Promise((resolve, reject) => {
        let multi = this.redis.pipeline();
        for (const key of keys) {
          multi = multi.getBuffer(this.makeKey(keySpace, key, this._cacheKeyFn));
        }
        multi.exec((err, replies) => {
          return err
            ? reject(err)
            : // [1] because it's an array where 0 = key, 1 = value.
            mapPromise(replies as any[], r => this.parse(r[1])).then(resolve);
        });
      });
    } else {
      return new Promise((resolve, reject) =>
        this.redis.mget(
          _.map(keys, k => this.makeKey(keySpace, k, this._cacheKeyFn)),
          (err, results) => {
            return err ? reject(err) : mapPromise(results as V[], (r, i) => this.parse(r)).then(resolve);
          }
        )
      );
    }
  }

  rSetAndGet(keySpace: string, key: K, rawVal: V, opt: RedisDataloaderOptions<K, V>) {
    return this.toString(rawVal).then(
      val =>
        new Promise((resolve, reject) => {
          const fullKey = this.makeKey(keySpace, key, this._cacheKeyFn);
          const multi = this.redis.multi();
          multi.set(fullKey, val);
          if (opt.expire) {
            multi.expire(fullKey, opt.expire);
          }
          if (opt.buffer) {
            multi.getBuffer(fullKey);
          } else {
            multi.get(fullKey);
          }
          multi.exec((err, replies) => {
            const lastReply = _.last(_.last(replies));
            return err ? reject(err) : this.parse(lastReply).then(resolve);
          });
        })
    );
  }

  private rDel(keySpace: string, key: K) {
    return new Promise((resolve, reject) =>
      this.redis.del(this.makeKey(keySpace, key, this._cacheKeyFn), (err, resp) => (err ? reject(err) : resolve(resp)))
    );
  }

  load(key: any) {
    return key ? Promise.resolve(this.loader.load(key)) : Promise.reject(new TypeError('key parameter is required'));
  }

  loadMany(keys: any[]) {
    return keys
      ? Promise.resolve(Promise.all(keys.map(k => this.loader.load(k))))
      : Promise.reject(new TypeError('keys parameter is required'));
  }

  prime(key: any, val: any) {
    if (!key) {
      return Promise.reject(new TypeError('key parameter is required'));
    } else if (val === undefined) {
      return Promise.reject(new TypeError('value parameter is required'));
    } else {
      return this.rSetAndGet(this.keySpace, key, val, this.opt).then((r: any) => {
        this.loader.clear(key).prime(key, r === '' ? null : r);
      });
    }
  }

  clear(key: any) {
    return key
      ? this.rDel(this.keySpace, key).then(() => this.loader.clear(key))
      : Promise.reject(new TypeError('key parameter is required'));
  }

  clearAllLocal() {
    return Promise.resolve(this.loader.clearAll());
  }
}
