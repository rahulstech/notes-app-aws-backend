import { APP_ERROR_CODE, AppError, newAppErrorBuilder } from "./apperror";
import { LOGGER } from "./logger";

export function encodeBase64(input: string, encoding: BufferEncoding = 'utf-8'): string {
    return Buffer.from(input, encoding).toString('base64url')
}

export function decodeBase64(input: string, decoding: BufferEncoding = 'utf-8'): string {
    return Buffer.from(input, 'base64url').toString(decoding)
}

export function renameKeys(target: Record<string,any>, nameMap: Record<string,string>): Record<string,any> {
    const output = { ...target };
    for(const inputKey in nameMap) {
        if (output[inputKey]) {
            const value = output[inputKey];
            delete output[inputKey];
            output[nameMap[inputKey]] = value;
        }
    }
    return output;
}

export function pickOnly(obj: Record<string, any>, keys: string[]): Record<string, any> {
    const result: Record<string, any> = {};
    for (const key of keys) {
      if (obj[key]) {
        result[key] = { ...obj[key] };
      }
    }
    return result;
  }

export function pickExcept(src: Record<any,any> | any[], exclude: any[]): Record<any,any> | any[] {
    if (Array.isArray(src)) {
        return pickExceptArray(src,exclude)
    }
    else {
        return pickExceptRecord(src,exclude);
    }
}

function pickExceptRecord(src: Record<string,any>, exclude: any[]): Record<any,any> {
    const output = { ...src };
    exclude.forEach(key => {
        if (output[key]) {
            delete output[key]
        }
    })
    return output
}

function pickExceptArray(src: any[], exclude: any[]): any[] {
    const output = new Set(src);
    exclude.forEach(item => output.delete(item));
    return [...output.values()];
}

export function createRecord<I, K extends string | number | symbol, V>(
    src: I[],
    keyBuilder: (item: I) => K,
    valueBuilder: (item: I) => V
): Record<K, V> {
    const record: Record<K, V> = {} as Record<K, V>;
    for (const item of src) {
        const key = keyBuilder(item);
        record[key] = valueBuilder(item);
    }
    return record;
}

export async function delay(ms: number) {
    if (ms < 0) {
        throw new Error(`negative delay milliseconds is not allowed; ms=${ms}`);
    }
    if (ms == 0) return;
    await new Promise(resolve => setTimeout(resolve, ms));
}

export async function executeChunk<I,O extends NonNullable<unknown>>(items: I[], handler: (chunk: I[])=>Promise<O[]>, chunkSize: number, delayMs: number = 0): Promise<O[]> {
    if (chunkSize < 1) {
        throw newAppErrorBuilder()
                .setHttpCode(500)
                .setCode(APP_ERROR_CODE.INTERNAL_SERVER_ERROR)
                .addDetails({
                    description: "internal server error",
                    context: "executeChunk",
                    reason: `chunkSize must be atleast 1; found ${chunkSize}`
                })
                .build();
    }
    const alloutputs: O[] = [];
    let processed = 0;
    while(processed < items.length) {
        const chunk = items.slice(processed, processed+chunkSize);
        const outputs = await handler(chunk);
        alloutputs.push(...outputs);
        await delay(Math.max(delayMs,0));
        processed += chunkSize;
    }
    return alloutputs;
}

export async function executeBatch<I,O>(items: I[], builder: (item: I)=>Promise<O>, batchSize: number, delayMs: number = 0): Promise<O[]> {
    if (batchSize < 1) {
        throw newAppErrorBuilder()
                .setHttpCode(500)
                .setCode(APP_ERROR_CODE.INTERNAL_SERVER_ERROR)
                .addDetails({
                    description: "internal server error",
                    context: "executeBatch",
                    reason: `batchSize must be atleast 1; found ${batchSize}`
                })
                .build();
    }
    const alloutputs: O[] = [];
    const count = items.length;
    let processed = 0;
    while(processed < count) {
        const chunk = items.slice(processed, processed+batchSize);
        const outputs = await Promise.all(chunk.map(builder));
        alloutputs.push(...outputs);
        await delay(Math.max(delayMs,0));
        processed += batchSize;
    }
    return alloutputs;
}


export function installUnexpectedErrorHandlers() {

    process.on('uncaughtException',handleUnexpectedError);

    process.on('unhandledRejection',handleUnexpectedError);
}

function handleUnexpectedError(error: any) {
    LOGGER.logFatal('unexpected error', error);
    const shouldExit: boolean = error instanceof AppError ? error.operational : true;
    if (shouldExit) {
        setTimeout(() => process.exit(1), 2000);
    }
}