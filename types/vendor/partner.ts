
export type Partner = {
    name: string,
    logo: string,
    description: string,
    url: string,
    tags: string[],
    options: {
        response_type: string,
        redirect_uri: string,
        client_id: string | undefined,
        scope: string | string[]
    }
}


