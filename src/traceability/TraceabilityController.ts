import { JsonLdBuilder } from "./JsonLdBuilder";
import { Activity, Trace, TrNode, Agent } from "./models";
import { TraceabilityAPIClient } from "./trace-api-client";

let jb = new JsonLdBuilder()
let act1 = new Activity("intocps:id1", "intocps:test", new Date("2023-01-01T15:23:55"))
let act2 = new Activity("intocps:id2", "intocps:test", new Date("2023-01-01T15:24:41"))
let tr = new Trace("intocps:id1", "test:tests", "intocps:id2")
let ag = new Agent("intocps:agent#tobias@frejo.dk", "Tobias Frejo", "tobias@frejo.dk")

jb.addNode(act1)
jb.addNode(act2)
jb.addTrace(tr)
jb.addNode(ag)

let nlist: Array<TrNode> = [ag, act1, act2]

export class TraceabilityController {
    client: TraceabilityAPIClient

    constructor () {
        this.client = new TraceabilityAPIClient("http://localhost:8080/v2/")

        this.client.sendGet("nodes")
        .then(data => {
            console.log("Received: ", JSON.stringify(data, null, 2))
        })
    }
}