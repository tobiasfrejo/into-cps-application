import { JsonLdBuilder } from "./JsonLdBuilder";
import { Activity, Trace, TrNode, Agent } from "./models";
import { TraceabilityAPIClient } from "./trace-api-client";

export class TraceabilityController {
    client: TraceabilityAPIClient
    receivedData: Object

    constructor () {
        this.client = new TraceabilityAPIClient("http://localhost:8080/v2/")

        this.get()
    }

    get() {
        this.client.sendGet("nodes")
        .then(data => {
            console.log("Received: ", JSON.stringify(data, null, 2))
            this.receivedData = data
        })
    }
}