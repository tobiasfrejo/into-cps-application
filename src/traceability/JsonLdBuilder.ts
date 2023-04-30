import * as jsonld from 'jsonld';
import { TrNode, Trace } from "./models";

const default_document: jsonld.JsonLdDocument = 
{
    "@context": {
        "rdf": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
        "prov": "http://www.w3.org/ns/prov#",
        "intocps": "http://into-cps.org/ns#",
        "name": "https://schema.org/name",
        "email": "https://schema.org/email",
        "hash": "https://schema.org/sha256",
        "time": "https://schema.org/DateTime",
        "type": "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
        "path": "http://ns.into-cps.org/Path"
    }
}


export class JsonLdBuilder {
    graph: Array<jsonld.ValueObject | jsonld.NodeObject> = []

    addNode(node: TrNode) {
        let n: jsonld.NodeObject = {
            "@id": node.uri,
            "@type": node.specifier,
            ...node.getParameters()
        }
        this.graph.push(n)
    }

    addTrace(trace: Trace) {
        let n: jsonld.NodeObject = {
            "@id": trace.subject,
            [trace.predicate]: trace.object
        }
        this.graph.push(n)
    }

    getDocument(): jsonld.JsonLdDocument {
        return {
            ...default_document,
            "@graph": this.graph
        }
    }

    stringify() {
        return JSON.stringify(this.getDocument())
    }
}