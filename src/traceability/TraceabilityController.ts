import { JsonLdBuilder } from "./JsonLdBuilder";
import { Activity, Trace, TrNode, Agent } from "./models";
import { TraceabilityAPIClient } from "./trace-api-client";

export class TraceabilityController {
    client: TraceabilityAPIClient
    receivedData: Object

    constructor () {
        this.client = new TraceabilityAPIClient("http://localhost:8080/v2/")
    }
}