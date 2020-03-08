/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElasticsearchServiceSetup } from 'kibana/server';
import * as Rx from 'rxjs';
import { catchError, map, mergeMap, takeUntil } from 'rxjs/operators';
import { PNG_JOB_TYPE } from '../../../../common/constants';
import { ReportingCore } from '../../../../server';
import {
  ESQueueWorkerExecuteFn,
  ExecuteJobFactory,
  JobDocOutput,
  Logger,
  ServerFacade,
} from '../../../../types';
import {
  decryptJobHeaders,
  getConditionalHeaders,
  getFullUrls,
  omitBlacklistedHeaders,
} from '../../../common/execute_job/';
import { JobDocPayloadPNG } from '../../types';
import { generatePngObservableFactory } from '../lib/generate_png';

type QueuedPngExecutorFactory = ExecuteJobFactory<ESQueueWorkerExecuteFn<JobDocPayloadPNG>>;

export const executeJobFactory: QueuedPngExecutorFactory = async function executeJobFactoryFn(
  reporting: ReportingCore,
  server: ServerFacade,
  elasticsearch: ElasticsearchServiceSetup,
  parentLogger: Logger
) {
  const browserDriverFactory = await reporting.getBrowserDriverFactory();
  const generatePngObservable = generatePngObservableFactory(server, browserDriverFactory);
  const logger = parentLogger.clone([PNG_JOB_TYPE, 'execute']);

  return function executeJob(jobId: string, job: JobDocPayloadPNG, cancellationToken: any) {
    const jobLogger = logger.clone([jobId]);
    const process$: Rx.Observable<JobDocOutput> = Rx.of(1).pipe(
      mergeMap(() => decryptJobHeaders({ server, job, logger })),
      map(decryptedHeaders => omitBlacklistedHeaders({ job, decryptedHeaders })),
      map(filteredHeaders => getConditionalHeaders({ server, job, filteredHeaders })),
      mergeMap(conditionalHeaders => {
        const urls = getFullUrls({ server, job });
        const hashUrl = urls[0];
        return generatePngObservable(
          jobLogger,
          hashUrl,
          job.browserTimezone,
          conditionalHeaders,
          job.layout
        );
      }),
      map(({ buffer, warnings }) => {
        return {
          content_type: 'image/png',
          content: buffer.toString('base64'),
          size: buffer.byteLength,
          warnings,
        };
      }),
      catchError(err => {
        jobLogger.error(err);
        return Rx.throwError(err);
      })
    );

    const stop$ = Rx.fromEventPattern(cancellationToken.on);
    return process$.pipe(takeUntil(stop$)).toPromise();
  };
};
