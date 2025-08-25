import { AppErrorItem } from "../error/AppError"

export function encodeBase64(input: string, encoding: BufferEncoding = 'utf-8'): string {
    return Buffer.from(input, encoding).toString('base64url')
}

export function decodeBase64(input: string, decoding: BufferEncoding = 'utf-8'): string {
    return Buffer.from(input, 'base64url').toString(decoding)
}

export function createAppErrorItem(error: Error | string, context?: string): AppErrorItem {
    if (error instanceof Error) {
        return { description: error.message, context }
    }
    return { description: error, context }
}

export function renameKeys(target: Record<string,any>, nameMap: Record<string,string>): Record<string,any> {
    const output = { ...target };
    Object.keys(nameMap).forEach(inputKey => {
        if (output[inputKey]) {
            const value = output[inputKey];
            delete output[inputKey]
            output[nameMap[inputKey]] = value
        }
    })
    return output
}

export function pickExcept(src: Record<any,any> | any[], exclude: any[]): Record<any,any> | any[] {
    if (Array.isArray(src)) {
        return pickExceptionArray(src,exclude)
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

function pickExceptionArray(src: any[], exclude: any[]): any[] {
    const output = new Set(src);
    exclude.forEach(item => output.delete(item));
    return [...output.values()];
}