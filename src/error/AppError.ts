interface ReasonDetail {
    explain: string,
    context?: string | undefined
}

interface Reason {
    description: string,
    details?: ReasonDetail[]
}

export type AppErrorReason = string | Reason

export default class AppError extends Error {

    public reason?: Reason;
    
    constructor(
        public code: number,
        reason: AppErrorReason,
        public operational: boolean = true
    ) {
        super();
        this.name = this.constructor.name;
        this.setReason(reason)
    }

    private setReason(reason: AppErrorReason) {
        if (typeof reason === 'string') {
            this.reason = { description: reason }
        }
        else {
            this.reason = reason
        }
    }
}