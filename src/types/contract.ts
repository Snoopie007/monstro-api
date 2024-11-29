
export type Contract = {
    id: number;
    title: string;
    description: string | null;
    content: string | null;
    created: Date;
    updated?: Date | null;
    deleted?: Date | null;
}