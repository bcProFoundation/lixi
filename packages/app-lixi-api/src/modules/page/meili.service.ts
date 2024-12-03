import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EnqueuedTask, MeiliSearch } from 'meilisearch';
import { I18n, I18nService } from 'nestjs-i18n';
import { InjectMeiliSearch, MEILI_CLIENT } from 'nestjs-meilisearch';
import { HASHTAG, LOCATIONS, PERSON, POSTS, TEMPLE } from './constants/meili.constants';

@Injectable()
export class MeiliService implements OnModuleInit {
  private logger: Logger = new Logger(MeiliService.name);

  constructor(
    @I18n() private i18n: I18nService,
    @Inject(MEILI_CLIENT) private readonly meiliSearch: MeiliSearch
  ) {}

  async onModuleInit() {
    await this.meiliSearch.index(`${process.env.MEILISEARCH_BUCKET}_${POSTS}`).updateSettings({
      searchableAttributes: ['content', 'postAccountName', 'hashtag'],
      displayedAttributes: ['*'],
      filterableAttributes: ['hashtag.content', 'page.id', 'token.id']
    });
    await this.meiliSearch.index(`${process.env.MEILISEARCH_BUCKET}_${PERSON}`).updateSettings({
      searchableAttributes: ['name', 'achievement'],
      displayedAttributes: ['*']
    });
    await this.meiliSearch.index(`${process.env.MEILISEARCH_BUCKET}_${TEMPLE}`).updateSettings({
      searchableAttributes: ['name', 'president', 'alias', 'religion'],
      displayedAttributes: ['*']
    });
    await this.meiliSearch.index(`${process.env.MEILISEARCH_BUCKET}_${HASHTAG}`).updateSettings({
      searchableAttributes: ['content'],
      displayedAttributes: ['*'],
      rankingRules: ['exactness', 'attribute', 'proximity', 'words', 'typo', 'sort'],
      typoTolerance: {
        enabled: false
      }
    });
    await this.meiliSearch.index(`${process.env.MEILISEARCH_BUCKET}_${LOCATIONS}`).updateSettings({
      rankingRules: ['words', 'typo', 'proximity', 'attribute', 'exactness', 'sort'],
      filterableAttributes: ['_geo'],
      sortableAttributes: ['_geo', 'cityAscii', 'adminNameAscii', 'country'],
      searchableAttributes: ['cityAscii', 'adminNameAscii', 'country']
    });
  }

  /**
   * Add document to the index
   * @param index The specific index
   * @param document The document you want to add
   * @param documentId The document id
   */
  public async add(index: string, document: any, documentId: string) {
    await this.meiliSearch
      .index(index)
      .addDocuments([{ ...document, primaryId: documentId }], { primaryKey: 'primaryId' });
  }

  /**P
   * Update document at the specify index
   * @param index The specific index
   * @param document The document you want to update
   */
  public async update(index: string, documents: any, documentId: string): Promise<EnqueuedTask> {
    return await this.meiliSearch
      .index(index)
      .updateDocuments([{ ...documents, primaryId: documentId }], { primaryKey: 'primaryId' });
  }

  /**
   * Delete document at the specify index
   * @param index The specific index
   * @param documentId The document id you want to delete
   */
  public async delete(index: string, documentId: string): Promise<EnqueuedTask> {
    return await this.meiliSearch.index(index).deleteDocument(documentId);
  }

  /**
   * Delete document at the specify index
   * @param index The specific index
   * @param content The hashtag content you want to search
   */
  public async searchHashtag(index: string, content: string) {
    const hits = await this.meiliSearch
      .index(index)
      .search(content)
      .then(res => {
        return res.hits;
      });
    return hits;
  }

  public async searchByLatLngHits(index: string, lat: string, lng: string, offset: number, limit: number) {
    const radius = 10000; // in meters
    try {
      const hits = await this.meiliSearch
        .index(index)
        .search(``, {
          filter: [`_geoRadius(${lat}, ${lng}, ${radius})`],
          offset: offset,
          limit: limit,
          sort: [`_geoPoint(${lat}, ${lng}):asc`]
        })
        .then(res => {
          return res.hits;
        });

      return hits;
    } catch (err) {
      console.log(err);
    }

    return [];
  }

  public async searchByLocationQueryHits(index: string, query: string, offset: number, limit: number) {
    try {
      const hits = await this.meiliSearch
        .index(index)
        .search(query, {
          offset: offset,
          limit: limit,
          sort: [
            'adminNameAscii:asc', // Then by state/region
            'cityAscii:asc', // Finally, by city
            'country:asc' // Sort by country first
          ]
        })
        .then(res => {
          return res.hits;
        });
      return hits;
    } catch (e) {
      console.log(e);
    }

    return [];
  }

  public async searchByQueryHits(index: string, query: string, offset: number, limit: number) {
    try {
      const hits = await this.meiliSearch
        .index(index)
        .search(query, {
          offset: offset,
          limit: limit
        })
        .then(res => {
          return res.hits;
        });
      return hits;
    } catch (e) {
      console.log(e);
    }

    return [];
  }

  public async searchByQueryEstimatedTotalHits(index: string, query: string) {
    return (await this.meiliSearch.index(index).search(query)).estimatedTotalHits;
  }
}
