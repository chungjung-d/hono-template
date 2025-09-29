import { Result } from "ts-results";

export const resolve = <T, E = Error>(result: Result<T, E>): T => {
    if (result.err) {
        throw result.val;
    }
    return result.val;
}