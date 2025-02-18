import * as jestExpect from "expect"
import * as isObject from "lodash.isobject"
// eslint-disable-next-line no-unused-vars
import {JsonObject, NetworkRequestHeaders} from "../types/generalTypes"
// eslint-disable-next-line no-unused-vars
import {RequestResponseInfo} from "../mockRequest"
// eslint-disable-next-line no-unused-vars
import {GraphQLAutoMockStartupOptions} from "../types/GraphQLAutoMockStartupOptions"
import {
    graphql,
    // eslint-disable-next-line no-unused-vars
    GraphQLMockedContext,
    // eslint-disable-next-line no-unused-vars
    GraphQLMockedRequest,
} from "msw"
import {autoGenerateResponseFromGraphQLSchema} from "./autoGenerateResponseFromGraphQLSchema"
import {setResponseBody} from "../responseHandlers/common"
// eslint-disable-next-line no-unused-vars
import {ResponseComposition} from "msw/lib/types/response"

export interface MswUsedRequestHeaders {
    map: NetworkRequestHeaders
}

export interface QueryParameters {
    [parameterName: string]: string | string[]
}

interface RequestHeadersWithArrayValues {
    [headerName: string]: string[] | string
}

export const normaliseRequestHeaderObject = (
    requestHeaders: NetworkRequestHeaders | RequestHeadersWithArrayValues
): NetworkRequestHeaders => {
    const headers = {}
    Object.keys(requestHeaders).forEach((header) => {
        const headerName = header.toLowerCase()
        if (Array.isArray(requestHeaders[header])) {
            headers[headerName] = requestHeaders[header][0]
        } else {
            headers[headerName] = requestHeaders[header] as string
        }
    })
    return headers
}

export const objectHasKeys = (obj: JsonObject): boolean => {
    return isObject(obj) && Object.keys(obj).length > 0
}

const constructRequestMadeStatusErrorMessage = (expectation: boolean) => {
    return `You expected that the request has${
        expectation === false ? " not" : ""
    } been made, but it was${expectation === true ? " not" : ""}.`
}

export const compareRequestMadeStatusAgainstExpectation = (
    hasRequestBeenDone: boolean,
    expectation: boolean,
    stacktrace: string
) => {
    try {
        jestExpect(hasRequestBeenDone).toBe(expectation)
    } catch (error) {
        throwErrorWithFixedStacktrace(
            constructRequestMadeStatusErrorMessage(expectation),
            stacktrace
        )
    }
}

export const updateRequestResponseInfo = ({
    requestResponseInfo,
    body,
    headers,
    url,
    called,
}: {
    requestResponseInfo: RequestResponseInfo
    body: any
    headers: any
    url: string
    called: boolean
}) => {
    requestResponseInfo.body = body
    requestResponseInfo.headers = headers
    requestResponseInfo.url = url
    requestResponseInfo.called = called
}

export const generateMswGraphQLAutoGenerationHandler = ({
    requestPattern,
    graphQLSchema,
    customTypes,
    fixedArrayLengths,
}: GraphQLAutoMockStartupOptions): any => {
    const specificGraphQLAPI = graphql.link(requestPattern)
    return specificGraphQLAPI.operation(
        (
            req: GraphQLMockedRequest,
            res: ResponseComposition,
            // eslint-disable-next-line no-unused-vars
            ctx: GraphQLMockedContext<unknown>
        ) => {
            const autoGeneratedResponse = autoGenerateResponseFromGraphQLSchema(
                {
                    stringSchema: graphQLSchema,
                    query: req.body.query,
                    variables: req.body.variables,
                    customTypes,
                    fixedArrayLengths,
                }
            )
            return res((response) => {
                setResponseBody(response, autoGeneratedResponse)
                response.headers.delete("x-powered-by")
                return response
            })
        }
    )
}

export const throwErrorWithFixedStacktrace = (
    message: string,
    stacktrace: string
) => {
    const err = Error(message)
    err.stack = stacktrace
    throw err
}

export const generateStacktraceWithoutMockedRequestInfo = () => {
    const stacktrace = new Error().stack
    const lines = stacktrace.split("\n")
    const regexForThisFile = /(dist|src)\/utils\/index\.(js|ts):\d+:\d+/
    const regexForEntryPoint = /(dist|src)\/index\.(js|ts):\d+:\d+/
    const linesWithoutInternals = lines.filter((line) => {
        return !regexForThisFile.test(line) && !regexForEntryPoint.test(line)
    })
    const stacktraceCleaned = linesWithoutInternals.join("\n")
    return stacktraceCleaned
}
